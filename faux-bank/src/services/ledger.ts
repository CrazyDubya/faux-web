import { D1Database } from '@cloudflare/workers-types';
import {
  Account,
  Transaction,
  TransactionType,
  TransactionStatus,
  AccountStatus,
  Amount,
  AccountBalances,
  formatAmount,
  CreateTransactionRequest,
} from '../types';
import { generateUUID } from '../utils/ids';
import { Errors, FauxBankAPIError } from '../utils/errors';
import { isValidAccountId } from '../utils/account-id';

/**
 * Core Ledger Service
 *
 * Implements double-entry accounting for all balance modifications.
 * Every transaction debits one account and credits another.
 */

export interface LedgerService {
  getAccount(accountId: string): Promise<Account | null>;
  getBalance(accountId: string): Promise<AccountBalances>;
  postTransaction(request: PostTransactionRequest): Promise<Transaction>;
  getTransaction(transactionId: string): Promise<Transaction | null>;
  getTransactionHistory(
    accountId: string,
    options?: TransactionHistoryOptions
  ): Promise<{ transactions: Transaction[]; next_cursor?: string }>;
  validateFunds(accountId: string, amount: number): Promise<boolean>;
}

export interface PostTransactionRequest {
  type: TransactionType;
  amount: Amount;
  debit_account: string;
  credit_account: string;
  reference?: string;
  memo?: string;
  idempotency_key?: string;
  parent_transaction_id?: string;
  agent_id?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

export interface TransactionHistoryOptions {
  from?: string;
  to?: string;
  type?: TransactionType;
  limit?: number;
  cursor?: string;
}

/**
 * Create a ledger service instance
 */
export function createLedgerService(db: D1Database): LedgerService {
  return {
    async getAccount(accountId: string): Promise<Account | null> {
      if (!isValidAccountId(accountId)) {
        throw Errors.invalidAccountFormat(accountId);
      }

      const result = await db
        .prepare(
          `SELECT * FROM accounts WHERE id = ?`
        )
        .bind(accountId)
        .first();

      if (!result) {
        return null;
      }

      return mapRowToAccount(result);
    },

    async getBalance(accountId: string): Promise<AccountBalances> {
      if (!isValidAccountId(accountId)) {
        throw Errors.invalidAccountFormat(accountId);
      }

      const result = await db
        .prepare(
          `SELECT balance_available, balance_ledger, balance_pending, balance_held, currency
           FROM accounts WHERE id = ?`
        )
        .bind(accountId)
        .first();

      if (!result) {
        throw Errors.accountNotFound(accountId);
      }

      const currency = (result.currency as string) || 'FXUSD';

      return {
        available: { value: result.balance_available as number, currency: currency as 'FXUSD' },
        ledger: { value: result.balance_ledger as number, currency: currency as 'FXUSD' },
        pending: { value: result.balance_pending as number, currency: currency as 'FXUSD' },
        held: { value: result.balance_held as number, currency: currency as 'FXUSD' },
      };
    },

    async postTransaction(request: PostTransactionRequest): Promise<Transaction> {
      // Validate account IDs
      if (!isValidAccountId(request.debit_account)) {
        throw Errors.invalidAccountFormat(request.debit_account);
      }
      if (!isValidAccountId(request.credit_account)) {
        throw Errors.invalidAccountFormat(request.credit_account);
      }

      // Validate amount
      if (request.amount.value <= 0) {
        throw Errors.invalidAmount('Amount must be positive');
      }

      // Check for duplicate transaction via idempotency key
      if (request.idempotency_key) {
        const existing = await db
          .prepare(`SELECT id FROM transactions WHERE idempotency_key = ?`)
          .bind(request.idempotency_key)
          .first();

        if (existing) {
          throw Errors.duplicateTransaction(request.idempotency_key);
        }
      }

      // Fetch both accounts
      const [debitAccount, creditAccount] = await Promise.all([
        this.getAccount(request.debit_account),
        this.getAccount(request.credit_account),
      ]);

      if (!debitAccount) {
        throw Errors.accountNotFound(request.debit_account);
      }
      if (!creditAccount) {
        throw Errors.accountNotFound(request.credit_account);
      }

      // Check account statuses
      if (debitAccount.status === 'FROZEN') {
        throw Errors.accountFrozen(request.debit_account);
      }
      if (debitAccount.status === 'CLOSED') {
        throw Errors.accountClosed(request.debit_account);
      }
      if (creditAccount.status === 'FROZEN') {
        throw Errors.accountFrozen(request.credit_account);
      }
      if (creditAccount.status === 'CLOSED') {
        throw Errors.accountClosed(request.credit_account);
      }

      // Check currency match
      if (debitAccount.currency !== creditAccount.currency) {
        throw Errors.currencyMismatch(debitAccount.currency, creditAccount.currency);
      }

      // Calculate available funds (including overdraft)
      const availableFunds =
        debitAccount.balances.available.value + debitAccount.overdraft_limit;

      // Check sufficient funds
      if (request.amount.value > availableFunds) {
        throw Errors.insufficientFunds(
          request.debit_account,
          availableFunds,
          request.amount.value
        );
      }

      // Generate transaction ID
      const transactionId = generateUUID();
      const now = new Date().toISOString();

      // Execute double-entry transaction atomically
      // D1 doesn't support true transactions yet, so we'll use a batch
      const statements = [
        // Insert transaction record
        db.prepare(
          `INSERT INTO transactions (
            id, type, status, debit_account_id, credit_account_id,
            amount, currency, reference, memo, idempotency_key,
            parent_transaction_id, agent_id, session_id, metadata,
            created_at, posted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          transactionId,
          request.type,
          'POSTED',
          request.debit_account,
          request.credit_account,
          request.amount.value,
          request.amount.currency,
          request.reference || null,
          request.memo || null,
          request.idempotency_key || null,
          request.parent_transaction_id || null,
          request.agent_id || null,
          request.session_id || null,
          request.metadata ? JSON.stringify(request.metadata) : null,
          now,
          now
        ),

        // Debit the source account
        db.prepare(
          `UPDATE accounts SET
            balance_available = balance_available - ?,
            balance_ledger = balance_ledger - ?,
            updated_at = ?
           WHERE id = ?`
        ).bind(request.amount.value, request.amount.value, now, request.debit_account),

        // Credit the destination account
        db.prepare(
          `UPDATE accounts SET
            balance_available = balance_available + ?,
            balance_ledger = balance_ledger + ?,
            updated_at = ?
           WHERE id = ?`
        ).bind(request.amount.value, request.amount.value, now, request.credit_account),
      ];

      await db.batch(statements);

      // Return the created transaction
      return {
        id: transactionId,
        type: request.type,
        status: 'POSTED',
        amount: request.amount,
        debit_account: request.debit_account,
        credit_account: request.credit_account,
        reference: request.reference,
        memo: request.memo,
        idempotency_key: request.idempotency_key,
        parent_transaction_id: request.parent_transaction_id,
        agent_id: request.agent_id,
        session_id: request.session_id,
        metadata: request.metadata,
        created_at: now,
        posted_at: now,
        risk_score: 0,
      };
    },

    async getTransaction(transactionId: string): Promise<Transaction | null> {
      const result = await db
        .prepare(`SELECT * FROM transactions WHERE id = ?`)
        .bind(transactionId)
        .first();

      if (!result) {
        return null;
      }

      return mapRowToTransaction(result);
    },

    async getTransactionHistory(
      accountId: string,
      options: TransactionHistoryOptions = {}
    ): Promise<{ transactions: Transaction[]; next_cursor?: string }> {
      if (!isValidAccountId(accountId)) {
        throw Errors.invalidAccountFormat(accountId);
      }

      const limit = Math.min(options.limit || 50, 500);
      let query = `
        SELECT * FROM transactions
        WHERE (debit_account_id = ? OR credit_account_id = ?)
      `;
      const params: unknown[] = [accountId, accountId];

      if (options.from) {
        query += ` AND created_at >= ?`;
        params.push(options.from);
      }

      if (options.to) {
        query += ` AND created_at <= ?`;
        params.push(options.to);
      }

      if (options.type) {
        query += ` AND type = ?`;
        params.push(options.type);
      }

      if (options.cursor) {
        query += ` AND created_at < ?`;
        params.push(options.cursor);
      }

      query += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit + 1); // Fetch one extra to determine if there's a next page

      const results = await db
        .prepare(query)
        .bind(...params)
        .all();

      const transactions = (results.results || []).map(mapRowToTransaction);

      let next_cursor: string | undefined;
      if (transactions.length > limit) {
        const lastTx = transactions.pop()!;
        next_cursor = lastTx.created_at;
      }

      return { transactions, next_cursor };
    },

    async validateFunds(accountId: string, amount: number): Promise<boolean> {
      const balance = await this.getBalance(accountId);
      const account = await this.getAccount(accountId);

      if (!account) {
        return false;
      }

      const availableFunds = balance.available.value + account.overdraft_limit;
      return amount <= availableFunds;
    },
  };
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

/**
 * Map a database row to a Transaction object
 */
function mapRowToTransaction(row: Record<string, unknown>): Transaction {
  const currency = (row.currency as string) || 'FXUSD';

  return {
    id: row.id as string,
    type: row.type as TransactionType,
    status: row.status as TransactionStatus,
    amount: { value: row.amount as number, currency: currency as 'FXUSD' },
    debit_account: row.debit_account_id as string,
    credit_account: row.credit_account_id as string,
    reference: row.reference as string | undefined,
    memo: row.memo as string | undefined,
    idempotency_key: row.idempotency_key as string | undefined,
    parent_transaction_id: row.parent_transaction_id as string | undefined,
    agent_id: row.agent_id as string | undefined,
    session_id: row.session_id as string | undefined,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    created_at: row.created_at as string,
    posted_at: row.posted_at as string | undefined,
    risk_score: row.risk_score as number,
  };
}
