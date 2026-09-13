/**
 * FauxBank API Client
 *
 * Provides typed access to the FauxBank simulation banking platform.
 */

import { z } from 'zod';

// ============================================================================
// Currency and Money Types
// ============================================================================

export const MoneySchema = z.object({
  value: z.number().int(), // Amount in cents
  currency: z.literal('FXUSD'),
});

export type Money = z.infer<typeof MoneySchema>;

export function createMoney(dollars: number): Money {
  return {
    value: Math.round(dollars * 100),
    currency: 'FXUSD',
  };
}

export function formatMoney(money: Money): string {
  return `F$${(money.value / 100).toFixed(2)}`;
}

// ============================================================================
// Account Types
// ============================================================================

export const AccountType = z.enum([
  'CH', // Checking
  'SV', // Savings
  'MM', // Money Market
  'CD', // Certificate of Deposit
  'LN', // Loan
  'MG', // Mortgage
  'CC', // Credit Card
  'LC', // Line of Credit
  'MC', // Merchant Account
  'TR', // Trust Account
  'ES', // Escrow
  'OP', // Operating Account
]);

export const AccountSegment = z.enum(['RETL', 'COMM', 'GOVT']);

export const AccountStatus = z.enum(['ACTIVE', 'FROZEN', 'CLOSED']);

export const AccountSchema = z.object({
  account_id: z.string(),
  type: AccountType,
  segment: AccountSegment,
  owner_id: z.string(),
  name: z.string(),
  balance: MoneySchema,
  available_balance: MoneySchema.optional(),
  status: AccountStatus,
  created_at: z.string(),
});

export type Account = z.infer<typeof AccountSchema>;

// ============================================================================
// Transaction Types
// ============================================================================

export const TransactionType = z.enum([
  'TRANSFER',
  'DEPOSIT',
  'WITHDRAWAL',
  'PAYMENT',
  'REFUND',
]);

export const TransactionStatus = z.enum([
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REVERSED',
]);

export const TransactionSchema = z.object({
  transaction_id: z.string(),
  type: TransactionType,
  amount: MoneySchema,
  debit_account: z.string(),
  credit_account: z.string(),
  status: TransactionStatus,
  memo: z.string(),
  posted_at: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

// ============================================================================
// Agent Types
// ============================================================================

export const AgentType = z.enum([
  'ECOMMERCE_MERCHANT',
  'CUSTOMER_AGENT',
  'PAYMENT_PROCESSOR',
  'ANALYTICS',
]);

export const AgentCapability = z.enum([
  'MERCHANT_PROCESSING',
  'BALANCE_READ',
  'TRANSFER',
  'ACCOUNT_CREATE',
  'TRANSACTION_HISTORY',
]);

export const AgentRegistrationSchema = z.object({
  agent_id: z.string(),
  agent_type: AgentType,
  capabilities_requested: z.array(AgentCapability),
});

export const AgentTokenResponseSchema = z.object({
  agent_token: z.string(),
  agent_id: z.string(),
  capabilities_granted: z.array(AgentCapability),
  expires_at: z.string(),
});

export type AgentTokenResponse = z.infer<typeof AgentTokenResponseSchema>;

// ============================================================================
// Authorization Types
// ============================================================================

export const AuthorizationStatus = z.enum([
  'APPROVED',
  'DECLINED',
  'PENDING',
  'ERROR',
]);

export const AuthorizationResponseSchema = z.object({
  authorization_id: z.string(),
  status: AuthorizationStatus,
  amount: MoneySchema,
  merchant_account: z.string(),
  card_last_four: z.string().optional(),
  timestamp: z.string(),
  decline_reason: z.string().optional(),
});

export type AuthorizationResponse = z.infer<typeof AuthorizationResponseSchema>;

// ============================================================================
// Error Types
// ============================================================================

export const FauxBankErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

export type FauxBankError = z.infer<typeof FauxBankErrorSchema>;

export class FauxBankAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'FauxBankAPIError';
  }

  static isRetryable(code: string): boolean {
    // Network and rate limit errors are retryable
    return code === 'FB-5001' || code.startsWith('FB-9');
  }
}

// ============================================================================
// Balance Response
// ============================================================================

export const BalanceResponseSchema = z.object({
  account_id: z.string(),
  balance: MoneySchema,
  available_balance: MoneySchema,
  as_of: z.string(),
});

export type BalanceResponse = z.infer<typeof BalanceResponseSchema>;

// ============================================================================
// Testing Types
// ============================================================================

export const FailureType = z.enum([
  'DECLINED',
  'TIMEOUT',
  'FRAUD_DETECTED',
  'INSUFFICIENT_FUNDS',
]);

export const SeedScenario = z.enum([
  'RETAIL_DEMO',
  'MERCHANT_DEMO',
  'CLEAN',
]);

// ============================================================================
// FauxBank Client
// ============================================================================

export interface FauxBankClientConfig {
  baseUrl: string;
  agentId: string;
  agentType: z.infer<typeof AgentType>;
  capabilities: z.infer<typeof AgentCapability>[];
  simulationId?: string;
}

export class FauxBankClient {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly config: FauxBankClientConfig;

  constructor(config: FauxBankClientConfig) {
    this.config = config;
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

  async ensureAuthenticated(): Promise<void> {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }
    await this.register();
  }

  async register(): Promise<AgentTokenResponse> {
    const response = await this.rawRequest('/v1/agents/register', {
      method: 'POST',
      body: JSON.stringify({
        agent_id: this.config.agentId,
        agent_type: this.config.agentType,
        capabilities_requested: this.config.capabilities,
      }),
    });

    const data = AgentTokenResponseSchema.parse(await response.json());
    this.token = data.agent_token;
    this.tokenExpiry = new Date(data.expires_at);
    return data;
  }

  // ==========================================================================
  // Account Operations
  // ==========================================================================

  async createAccount(params: {
    type: z.infer<typeof AccountType>;
    segment: z.infer<typeof AccountSegment>;
    ownerId: string;
    name: string;
    initialDeposit: Money;
    creditLimit?: Money;
  }): Promise<Account> {
    const response = await this.request('/v1/accounts', {
      method: 'POST',
      body: JSON.stringify({
        type: params.type,
        segment: params.segment,
        owner_id: params.ownerId,
        name: params.name,
        initial_deposit: params.initialDeposit,
        credit_limit: params.creditLimit,
      }),
    });

    return AccountSchema.parse(await response.json());
  }

  async getBalance(accountId: string): Promise<BalanceResponse> {
    const response = await this.request(`/v1/accounts/${accountId}/balance`);
    return BalanceResponseSchema.parse(await response.json());
  }

  async getAccount(accountId: string): Promise<Account> {
    const response = await this.request(`/v1/accounts/${accountId}`);
    return AccountSchema.parse(await response.json());
  }

  // ==========================================================================
  // Transaction Operations
  // ==========================================================================

  async transfer(params: {
    fromAccount: string;
    toAccount: string;
    amount: Money;
    memo: string;
    idempotencyKey?: string;
  }): Promise<Transaction> {
    const headers: Record<string, string> = {};
    if (params.idempotencyKey) {
      headers['Idempotency-Key'] = params.idempotencyKey;
    }

    const response = await this.request('/v1/transactions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'TRANSFER',
        amount: params.amount,
        debit_account: params.fromAccount,
        credit_account: params.toAccount,
        memo: params.memo,
      }),
    });

    return TransactionSchema.parse(await response.json());
  }

  async getTransactionHistory(
    accountId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ items: Transaction[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const url = `/v1/accounts/${accountId}/transactions${params.toString() ? `?${params}` : ''}`;
    const response = await this.request(url);

    const data = await response.json() as { items: unknown[]; total: number };
    return {
      items: data.items.map((item) => TransactionSchema.parse(item)),
      total: data.total,
    };
  }

  // ==========================================================================
  // Card/Merchant Operations
  // ==========================================================================

  async authorizeCard(params: {
    merchantAccount: string;
    cardToken: string;
    amount: Money;
    orderReference: string;
  }): Promise<AuthorizationResponse> {
    const response = await this.request('/v1/commercial/merchant/authorize', {
      method: 'POST',
      body: JSON.stringify({
        merchant_account: params.merchantAccount,
        card_token: params.cardToken,
        amount: params.amount,
        order_reference: params.orderReference,
      }),
    });

    return AuthorizationResponseSchema.parse(await response.json());
  }

  async captureAuthorization(authorizationId: string): Promise<Transaction> {
    const response = await this.request(
      `/v1/commercial/merchant/capture/${authorizationId}`,
      { method: 'POST' }
    );
    return TransactionSchema.parse(await response.json());
  }

  async voidAuthorization(authorizationId: string): Promise<void> {
    await this.request(`/v1/commercial/merchant/void/${authorizationId}`, {
      method: 'POST',
    });
  }

  // ==========================================================================
  // Testing Operations
  // ==========================================================================

  async injectFailure(params: {
    network: string;
    failureType: z.infer<typeof FailureType>;
    probability: number;
    durationSeconds: number;
  }): Promise<void> {
    await this.request('/v1/testing/network/inject-failure', {
      method: 'POST',
      body: JSON.stringify({
        network: params.network,
        failure_type: params.failureType,
        probability: params.probability,
        duration_seconds: params.durationSeconds,
      }),
    });
  }

  async advanceTime(duration: string): Promise<void> {
    await this.request('/v1/testing/time/advance', {
      method: 'POST',
      body: JSON.stringify({ advance_by: duration }),
    });
  }

  async resetEnvironment(params?: {
    preserveAgents?: boolean;
    seedScenario?: z.infer<typeof SeedScenario>;
  }): Promise<void> {
    await this.request('/v1/testing/reset', {
      method: 'POST',
      body: JSON.stringify({
        preserve_agents: params?.preserveAgents ?? true,
        seed_scenario: params?.seedScenario ?? 'CLEAN',
      }),
    });
  }

  // ==========================================================================
  // Internal Request Handling
  // ==========================================================================

  private async rawRequest(
    path: string,
    options?: RequestInit
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (this.config.simulationId) {
      headers['X-Simulation-ID'] = this.config.simulationId;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    return response;
  }

  private async request(path: string, options?: RequestInit): Promise<Response> {
    await this.ensureAuthenticated();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
      ...(options?.headers as Record<string, string>),
    };

    if (this.config.simulationId) {
      headers['X-Simulation-ID'] = this.config.simulationId;
    }

    const url = `${this.config.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    return response;
  }

  private async handleError(response: Response): Promise<never> {
    let errorData: FauxBankError;

    try {
      errorData = FauxBankErrorSchema.parse(await response.json());
    } catch {
      throw new FauxBankAPIError(
        `FB-${response.status}`,
        `HTTP ${response.status}: ${response.statusText}`,
        { status: response.status }
      );
    }

    throw new FauxBankAPIError(
      errorData.error.code,
      errorData.error.message,
      errorData.error.details
    );
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  getCardToken(accountId: string): string {
    return `CARD-${accountId}`;
  }

  setSimulationId(simulationId: string): void {
    (this.config as { simulationId: string }).simulationId = simulationId;
  }
}

// ============================================================================
// Retry Wrapper
// ============================================================================

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof FauxBankAPIError) {
        if (!FauxBankAPIError.isRetryable(error.code)) {
          throw error;
        }
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
