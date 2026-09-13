import { DurableObject } from 'cloudflare:workers';

/**
 * AccountLedger Durable Object
 *
 * Provides strong consistency for per-account balance operations.
 * Each account is its own Durable Object instance, ensuring:
 * - Serialized transaction processing (no double-spend)
 * - Strong consistency for balance queries
 * - Natural sharding by account
 */

interface AccountState {
  id: string;
  balance_available: number;
  balance_ledger: number;
  balance_pending: number;
  balance_held: number;
  overdraft_limit: number;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED' | 'PENDING';
  last_updated: string;
}

interface HoldRequest {
  authorization_id: string;
  amount: number;
  expires_at: string;
}

interface TransactionRequest {
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  transaction_id: string;
}

export class AccountLedger extends DurableObject {
  private state: AccountState | null = null;
  private holds: Map<string, HoldRequest> = new Map();

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
  }

  /**
   * Initialize or load account state
   */
  private async loadState(): Promise<AccountState> {
    if (this.state) {
      return this.state;
    }

    const stored = await this.ctx.storage.get<AccountState>('state');
    if (stored) {
      this.state = stored;
      // Load holds
      const holdsList = await this.ctx.storage.get<Array<[string, HoldRequest]>>('holds');
      if (holdsList) {
        this.holds = new Map(holdsList);
      }
      return this.state;
    }

    // Return uninitialized state
    throw new Error('Account not initialized');
  }

  /**
   * Save state to storage
   */
  private async saveState(): Promise<void> {
    if (!this.state) return;

    await this.ctx.storage.put('state', this.state);
    await this.ctx.storage.put('holds', Array.from(this.holds.entries()));
  }

  /**
   * Handle incoming requests
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case '/initialize':
          return await this.handleInitialize(request);

        case '/balance':
          return await this.handleBalance();

        case '/debit':
          return await this.handleDebit(request);

        case '/credit':
          return await this.handleCredit(request);

        case '/hold':
          return await this.handleHold(request);

        case '/release-hold':
          return await this.handleReleaseHold(request);

        case '/capture-hold':
          return await this.handleCaptureHold(request);

        case '/freeze':
          return await this.handleFreeze();

        case '/unfreeze':
          return await this.handleUnfreeze();

        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Initialize account state
   */
  private async handleInitialize(request: Request): Promise<Response> {
    const body = await request.json() as {
      id: string;
      overdraft_limit?: number;
      initial_balance?: number;
    };

    this.state = {
      id: body.id,
      balance_available: body.initial_balance || 0,
      balance_ledger: body.initial_balance || 0,
      balance_pending: 0,
      balance_held: 0,
      overdraft_limit: body.overdraft_limit || 0,
      status: 'ACTIVE',
      last_updated: new Date().toISOString(),
    };

    await this.saveState();

    return new Response(JSON.stringify(this.state), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get current balance
   */
  private async handleBalance(): Promise<Response> {
    const state = await this.loadState();

    // Clean up expired holds
    await this.cleanupExpiredHolds();

    return new Response(
      JSON.stringify({
        available: state.balance_available,
        ledger: state.balance_ledger,
        pending: state.balance_pending,
        held: state.balance_held,
        status: state.status,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Process a debit transaction
   */
  private async handleDebit(request: Request): Promise<Response> {
    const state = await this.loadState();
    const body = await request.json() as TransactionRequest;

    if (state.status === 'FROZEN') {
      return new Response(
        JSON.stringify({ error: 'Account is frozen' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (state.status === 'CLOSED') {
      return new Response(
        JSON.stringify({ error: 'Account is closed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check available funds (including overdraft)
    const availableFunds = state.balance_available + state.overdraft_limit;
    if (body.amount > availableFunds) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient funds',
          available: availableFunds,
          requested: body.amount,
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Apply debit
    state.balance_available -= body.amount;
    state.balance_ledger -= body.amount;
    state.last_updated = new Date().toISOString();

    await this.saveState();

    return new Response(
      JSON.stringify({
        success: true,
        new_balance: state.balance_available,
        transaction_id: body.transaction_id,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Process a credit transaction
   */
  private async handleCredit(request: Request): Promise<Response> {
    const state = await this.loadState();
    const body = await request.json() as TransactionRequest;

    if (state.status === 'CLOSED') {
      return new Response(
        JSON.stringify({ error: 'Account is closed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Apply credit
    state.balance_available += body.amount;
    state.balance_ledger += body.amount;
    state.last_updated = new Date().toISOString();

    await this.saveState();

    return new Response(
      JSON.stringify({
        success: true,
        new_balance: state.balance_available,
        transaction_id: body.transaction_id,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Place a hold on funds (for authorization)
   */
  private async handleHold(request: Request): Promise<Response> {
    const state = await this.loadState();
    const body = await request.json() as HoldRequest;

    if (state.status !== 'ACTIVE') {
      return new Response(
        JSON.stringify({ error: `Account is ${state.status.toLowerCase()}` }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check available funds
    const availableFunds = state.balance_available + state.overdraft_limit;
    if (body.amount > availableFunds) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient funds for hold',
          available: availableFunds,
          requested: body.amount,
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Place hold
    state.balance_available -= body.amount;
    state.balance_held += body.amount;
    state.last_updated = new Date().toISOString();

    this.holds.set(body.authorization_id, body);

    await this.saveState();

    return new Response(
      JSON.stringify({
        success: true,
        authorization_id: body.authorization_id,
        amount_held: body.amount,
        expires_at: body.expires_at,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Release a hold (void authorization)
   */
  private async handleReleaseHold(request: Request): Promise<Response> {
    const state = await this.loadState();
    const body = await request.json() as { authorization_id: string };

    const hold = this.holds.get(body.authorization_id);
    if (!hold) {
      return new Response(
        JSON.stringify({ error: 'Hold not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Release hold
    state.balance_available += hold.amount;
    state.balance_held -= hold.amount;
    state.last_updated = new Date().toISOString();

    this.holds.delete(body.authorization_id);

    await this.saveState();

    return new Response(
      JSON.stringify({
        success: true,
        authorization_id: body.authorization_id,
        amount_released: hold.amount,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Capture a hold (convert to actual debit)
   */
  private async handleCaptureHold(request: Request): Promise<Response> {
    const state = await this.loadState();
    const body = await request.json() as {
      authorization_id: string;
      capture_amount?: number;
      transaction_id: string;
    };

    const hold = this.holds.get(body.authorization_id);
    if (!hold) {
      return new Response(
        JSON.stringify({ error: 'Hold not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const captureAmount = body.capture_amount || hold.amount;

    if (captureAmount > hold.amount) {
      return new Response(
        JSON.stringify({
          error: 'Capture amount exceeds hold amount',
          hold_amount: hold.amount,
          capture_amount: captureAmount,
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Capture: reduce held, reduce ledger, possibly release excess
    state.balance_held -= hold.amount;
    state.balance_ledger -= captureAmount;

    // If partial capture, release the difference back to available
    if (captureAmount < hold.amount) {
      state.balance_available += (hold.amount - captureAmount);
    }

    state.last_updated = new Date().toISOString();

    this.holds.delete(body.authorization_id);

    await this.saveState();

    return new Response(
      JSON.stringify({
        success: true,
        authorization_id: body.authorization_id,
        amount_captured: captureAmount,
        transaction_id: body.transaction_id,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Freeze the account
   */
  private async handleFreeze(): Promise<Response> {
    const state = await this.loadState();
    state.status = 'FROZEN';
    state.last_updated = new Date().toISOString();
    await this.saveState();

    return new Response(
      JSON.stringify({ success: true, status: 'FROZEN' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Unfreeze the account
   */
  private async handleUnfreeze(): Promise<Response> {
    const state = await this.loadState();
    state.status = 'ACTIVE';
    state.last_updated = new Date().toISOString();
    await this.saveState();

    return new Response(
      JSON.stringify({ success: true, status: 'ACTIVE' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Clean up expired holds
   */
  private async cleanupExpiredHolds(): Promise<void> {
    if (!this.state) return;

    const now = new Date();
    const expiredHolds: string[] = [];

    for (const [id, hold] of this.holds) {
      if (new Date(hold.expires_at) < now) {
        expiredHolds.push(id);
      }
    }

    for (const id of expiredHolds) {
      const hold = this.holds.get(id)!;
      this.state.balance_available += hold.amount;
      this.state.balance_held -= hold.amount;
      this.holds.delete(id);
    }

    if (expiredHolds.length > 0) {
      this.state.last_updated = new Date().toISOString();
      await this.saveState();
    }
  }
}
