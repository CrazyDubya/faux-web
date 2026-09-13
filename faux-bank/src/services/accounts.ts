import { D1Database } from '@cloudflare/workers-types';
import {
  Account,
  AccountStatus,
  AccountTypeCode,
  SegmentCode,
  CreateAccountRequest,
  UpdateAccountRequest,
  FreezeAccountRequest,
  Amount,
} from '../types';
import { generateAccountId, isValidAccountId, isValidTypeSegmentCombination } from '../utils/account-id';
import { Errors } from '../utils/errors';
import { createLedgerService, LedgerService } from './ledger';

/**
 * Account Service
 *
 * Handles account lifecycle operations: create, read, update, freeze, close.
 */

export interface AccountService {
  createAccount(request: CreateAccountRequest, agentId?: string): Promise<Account>;
  getAccount(accountId: string): Promise<Account | null>;
  updateAccount(accountId: string, request: UpdateAccountRequest): Promise<Account>;
  freezeAccount(accountId: string, request: FreezeAccountRequest): Promise<void>;
  unfreezeAccount(accountId: string): Promise<void>;
  closeAccount(accountId: string): Promise<void>;
  listAccountsByOwner(ownerId: string): Promise<Account[]>;
}

export function createAccountService(db: D1Database): AccountService {
  const ledger = createLedgerService(db);

  return {
    async createAccount(request: CreateAccountRequest, agentId?: string): Promise<Account> {
      // Validate type/segment combination
      if (!isValidTypeSegmentCombination(request.type, request.segment)) {
        throw Errors.validationError({
          type_segment: [`Invalid combination: ${request.type} cannot be in segment ${request.segment}`],
        });
      }

      // Generate account ID
      const accountId = generateAccountId(request.type, request.segment);
      const now = new Date().toISOString();

      // Determine initial configuration based on account type
      const config = getAccountTypeConfig(request.type);

      // Insert account
      await db
        .prepare(
          `INSERT INTO accounts (
            id, type, segment, owner_id, name, status, currency,
            balance_available, balance_ledger, balance_pending, balance_held,
            overdraft_limit, daily_withdrawal_limit, daily_transfer_limit,
            interest_rate_bps, monthly_fee, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          accountId,
          request.type,
          request.segment,
          request.owner_id,
          request.name || null,
          'ACTIVE',
          'FXUSD',
          0, // balance_available
          0, // balance_ledger
          0, // balance_pending
          0, // balance_held
          config.overdraft_limit,
          config.daily_withdrawal_limit,
          config.daily_transfer_limit,
          config.interest_rate_bps,
          config.monthly_fee,
          now,
          now
        )
        .run();

      // If there's an initial deposit, process it
      if (request.initial_deposit && request.initial_deposit.value > 0) {
        await ledger.postTransaction({
          type: 'DEPOSIT',
          amount: request.initial_deposit,
          debit_account: 'CH-COMM-SEEDBANK-AA', // Central liquidity pool
          credit_account: accountId,
          memo: 'Initial deposit',
          agent_id: agentId,
        });
      }

      // Fetch and return the created account
      const account = await ledger.getAccount(accountId);
      if (!account) {
        throw Errors.internalError('Failed to create account');
      }

      return account;
    },

    async getAccount(accountId: string): Promise<Account | null> {
      return ledger.getAccount(accountId);
    },

    async updateAccount(accountId: string, request: UpdateAccountRequest): Promise<Account> {
      if (!isValidAccountId(accountId)) {
        throw Errors.invalidAccountFormat(accountId);
      }

      const account = await ledger.getAccount(accountId);
      if (!account) {
        throw Errors.accountNotFound(accountId);
      }

      if (account.status === 'CLOSED') {
        throw Errors.accountClosed(accountId);
      }

      const now = new Date().toISOString();
      const updates: string[] = [];
      const params: unknown[] = [];

      if (request.name !== undefined) {
        updates.push('name = ?');
        params.push(request.name);
      }

      if (request.preferences) {
        // Merge preferences into existing metadata
        const metadata = { ...account.metadata, preferences: request.preferences };
        updates.push('metadata = ?');
        params.push(JSON.stringify(metadata));
      }

      if (updates.length === 0) {
        return account;
      }

      updates.push('updated_at = ?');
      params.push(now);
      params.push(accountId);

      await db
        .prepare(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...params)
        .run();

      const updated = await ledger.getAccount(accountId);
      if (!updated) {
        throw Errors.internalError('Failed to update account');
      }

      return updated;
    },

    async freezeAccount(accountId: string, request: FreezeAccountRequest): Promise<void> {
      if (!isValidAccountId(accountId)) {
        throw Errors.invalidAccountFormat(accountId);
      }

      const account = await ledger.getAccount(accountId);
      if (!account) {
        throw Errors.accountNotFound(accountId);
      }

      if (account.status === 'CLOSED') {
        throw Errors.accountClosed(accountId);
      }

      if (account.status === 'FROZEN') {
        return; // Already frozen
      }

      const now = new Date().toISOString();
      const metadata = {
        ...account.metadata,
        freeze_reason: request.reason,
        frozen_at: now,
      };

      await db
        .prepare(
          `UPDATE accounts SET status = ?, metadata = ?, updated_at = ? WHERE id = ?`
        )
        .bind('FROZEN', JSON.stringify(metadata), now, accountId)
        .run();
    },

    async unfreezeAccount(accountId: string): Promise<void> {
      if (!isValidAccountId(accountId)) {
        throw Errors.invalidAccountFormat(accountId);
      }

      const account = await ledger.getAccount(accountId);
      if (!account) {
        throw Errors.accountNotFound(accountId);
      }

      if (account.status !== 'FROZEN') {
        return; // Not frozen
      }

      const now = new Date().toISOString();
      const metadata = { ...account.metadata };
      delete (metadata as Record<string, unknown>).freeze_reason;
      delete (metadata as Record<string, unknown>).frozen_at;

      await db
        .prepare(
          `UPDATE accounts SET status = ?, metadata = ?, updated_at = ? WHERE id = ?`
        )
        .bind('ACTIVE', JSON.stringify(metadata), now, accountId)
        .run();
    },

    async closeAccount(accountId: string): Promise<void> {
      if (!isValidAccountId(accountId)) {
        throw Errors.invalidAccountFormat(accountId);
      }

      const account = await ledger.getAccount(accountId);
      if (!account) {
        throw Errors.accountNotFound(accountId);
      }

      if (account.status === 'CLOSED') {
        return; // Already closed
      }

      // Check for zero balance
      if (account.balances.ledger.value !== 0) {
        throw Errors.validationError({
          balance: ['Account must have zero balance to close'],
        });
      }

      const now = new Date().toISOString();

      await db
        .prepare(
          `UPDATE accounts SET status = ?, closed_at = ?, updated_at = ? WHERE id = ?`
        )
        .bind('CLOSED', now, now, accountId)
        .run();
    },

    async listAccountsByOwner(ownerId: string): Promise<Account[]> {
      const results = await db
        .prepare(`SELECT * FROM accounts WHERE owner_id = ? ORDER BY created_at DESC`)
        .bind(ownerId)
        .all();

      return (results.results || []).map(row => mapRowToAccount(row));
    },
  };
}

/**
 * Get default configuration for an account type
 */
function getAccountTypeConfig(type: AccountTypeCode): {
  overdraft_limit: number;
  daily_withdrawal_limit: number;
  daily_transfer_limit: number;
  interest_rate_bps: number;
  monthly_fee: number;
} {
  const configs: Record<AccountTypeCode, ReturnType<typeof getAccountTypeConfig>> = {
    CH: {
      overdraft_limit: 50000, // F$500
      daily_withdrawal_limit: 50000,
      daily_transfer_limit: 1000000,
      interest_rate_bps: 0,
      monthly_fee: 1200,
    },
    SV: {
      overdraft_limit: 0,
      daily_withdrawal_limit: 50000,
      daily_transfer_limit: 1000000,
      interest_rate_bps: 450, // 4.50%
      monthly_fee: 0,
    },
    MM: {
      overdraft_limit: 0,
      daily_withdrawal_limit: 100000,
      daily_transfer_limit: 2000000,
      interest_rate_bps: 480, // 4.80%
      monthly_fee: 0,
    },
    CD: {
      overdraft_limit: 0,
      daily_withdrawal_limit: 0, // Cannot withdraw
      daily_transfer_limit: 0,
      interest_rate_bps: 500, // 5.00%
      monthly_fee: 0,
    },
    LN: {
      overdraft_limit: 0,
      daily_withdrawal_limit: 0,
      daily_transfer_limit: 0,
      interest_rate_bps: 850, // 8.50%
      monthly_fee: 0,
    },
    MG: {
      overdraft_limit: 0,
      daily_withdrawal_limit: 0,
      daily_transfer_limit: 0,
      interest_rate_bps: 699, // 6.99%
      monthly_fee: 0,
    },
    CC: {
      overdraft_limit: 0, // Credit limit handled separately
      daily_withdrawal_limit: 50000,
      daily_transfer_limit: 500000,
      interest_rate_bps: 1999, // 19.99%
      monthly_fee: 0,
    },
    LC: {
      overdraft_limit: 0,
      daily_withdrawal_limit: 100000,
      daily_transfer_limit: 1000000,
      interest_rate_bps: 850, // Prime + margin
      monthly_fee: 0,
    },
    MC: {
      overdraft_limit: 0,
      daily_withdrawal_limit: 0,
      daily_transfer_limit: 100000000, // F$1M
      interest_rate_bps: 0,
      monthly_fee: 2500, // F$25
    },
    TR: {
      overdraft_limit: 0,
      daily_withdrawal_limit: 100000,
      daily_transfer_limit: 1000000,
      interest_rate_bps: 300,
      monthly_fee: 5000,
    },
    ES: {
      overdraft_limit: 0,
      daily_withdrawal_limit: 0,
      daily_transfer_limit: 0,
      interest_rate_bps: 0,
      monthly_fee: 0,
    },
    OP: {
      overdraft_limit: 0,
      daily_withdrawal_limit: 1000000,
      daily_transfer_limit: 10000000,
      interest_rate_bps: 0,
      monthly_fee: 0,
    },
  };

  return configs[type];
}

/**
 * Map a database row to an Account object
 */
function mapRowToAccount(row: Record<string, unknown>): Account {
  const currency = (row.currency as string) || 'FXUSD';

  return {
    id: row.id as string,
    type: row.type as Account['type'],
    segment: row.segment as Account['segment'],
    status: row.status as AccountStatus,
    owner_id: row.owner_id as string,
    name: row.name as string | undefined,
    currency: currency as 'FXUSD',
    balances: {
      available: { value: row.balance_available as number, currency: currency as 'FXUSD' },
      ledger: { value: row.balance_ledger as number, currency: currency as 'FXUSD' },
      pending: { value: row.balance_pending as number, currency: currency as 'FXUSD' },
      held: { value: row.balance_held as number, currency: currency as 'FXUSD' },
    },
    overdraft_limit: row.overdraft_limit as number,
    daily_withdrawal_limit: row.daily_withdrawal_limit as number,
    daily_transfer_limit: row.daily_transfer_limit as number,
    interest_rate_bps: row.interest_rate_bps as number,
    monthly_fee: row.monthly_fee as number,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    closed_at: row.closed_at as string | undefined,
  };
}
