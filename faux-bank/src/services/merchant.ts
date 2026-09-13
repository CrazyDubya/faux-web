import { D1Database } from '@cloudflare/workers-types';
import {
  Authorization,
  AuthorizationStatus,
  DeclineReason,
  CardAuthorizationRequest,
  CaptureRequest,
  RefundRequest,
  Amount,
  Transaction,
} from '../types';
import { generateAuthorizationId, generateUUID } from '../utils/ids';
import { Errors } from '../utils/errors';
import { isValidAccountId } from '../utils/account-id';
import { createLedgerService, LedgerService } from './ledger';

/**
 * Merchant Service
 *
 * Handles card authorizations, captures, refunds, and voids.
 */

export interface MerchantService {
  authorize(
    request: CardAuthorizationRequest,
    agentId?: string
  ): Promise<{
    authorization_id: string;
    status: AuthorizationStatus;
    decline_reason?: DeclineReason;
    amount_authorized: Amount;
    expires_at: string;
  }>;

  capture(
    request: CaptureRequest,
    agentId?: string
  ): Promise<{
    transaction_id: string;
    amount_captured: Amount;
    settles_at: string;
  }>;

  refund(
    request: RefundRequest,
    agentId?: string
  ): Promise<Transaction>;

  void(
    authorizationId: string,
    agentId?: string
  ): Promise<void>;

  getAuthorization(authorizationId: string): Promise<Authorization | null>;

  simulateChargeback(
    transactionId: string,
    reasonCode: string,
    amount?: Amount,
    agentId?: string
  ): Promise<{
    chargeback_id: string;
    status: string;
    respond_by: string;
  }>;
}

export function createMerchantService(db: D1Database): MerchantService {
  const ledger = createLedgerService(db);

  return {
    async authorize(
      request: CardAuthorizationRequest,
      agentId?: string
    ) {
      // Validate merchant account
      if (!isValidAccountId(request.merchant_account)) {
        throw Errors.invalidAccountFormat(request.merchant_account);
      }

      const merchantAccount = await ledger.getAccount(request.merchant_account);
      if (!merchantAccount) {
        throw Errors.accountNotFound(request.merchant_account);
      }

      if (merchantAccount.type !== 'MC') {
        throw Errors.validationError({
          merchant_account: ['Must be a merchant account (MC type)'],
        });
      }

      // Look up customer account from card token
      // In a real system, this would involve a card token vault
      // For simulation, we'll extract the account ID from the token or look it up
      const customerAccountId = await resolveCardToken(db, request.card_token);
      if (!customerAccountId) {
        return {
          authorization_id: generateAuthorizationId(),
          status: 'DECLINED' as AuthorizationStatus,
          decline_reason: 'INVALID_CARD' as DeclineReason,
          amount_authorized: { value: 0, currency: request.amount.currency },
          expires_at: new Date().toISOString(),
        };
      }

      const customerAccount = await ledger.getAccount(customerAccountId);
      if (!customerAccount) {
        return {
          authorization_id: generateAuthorizationId(),
          status: 'DECLINED' as AuthorizationStatus,
          decline_reason: 'INVALID_CARD' as DeclineReason,
          amount_authorized: { value: 0, currency: request.amount.currency },
          expires_at: new Date().toISOString(),
        };
      }

      // Check account status
      if (customerAccount.status === 'FROZEN') {
        return {
          authorization_id: generateAuthorizationId(),
          status: 'DECLINED' as AuthorizationStatus,
          decline_reason: 'FRAUD_SUSPECTED' as DeclineReason,
          amount_authorized: { value: 0, currency: request.amount.currency },
          expires_at: new Date().toISOString(),
        };
      }

      if (customerAccount.status !== 'ACTIVE') {
        return {
          authorization_id: generateAuthorizationId(),
          status: 'DECLINED' as AuthorizationStatus,
          decline_reason: 'INVALID_CARD' as DeclineReason,
          amount_authorized: { value: 0, currency: request.amount.currency },
          expires_at: new Date().toISOString(),
        };
      }

      // Check available funds
      const availableFunds =
        customerAccount.balances.available.value + customerAccount.overdraft_limit;

      if (request.amount.value > availableFunds) {
        return {
          authorization_id: generateAuthorizationId(),
          status: 'DECLINED' as AuthorizationStatus,
          decline_reason: 'INSUFFICIENT_FUNDS' as DeclineReason,
          amount_authorized: { value: 0, currency: request.amount.currency },
          expires_at: new Date().toISOString(),
        };
      }

      // Check daily limits
      if (request.amount.value > customerAccount.daily_transfer_limit) {
        return {
          authorization_id: generateAuthorizationId(),
          status: 'DECLINED' as AuthorizationStatus,
          decline_reason: 'LIMIT_EXCEEDED' as DeclineReason,
          amount_authorized: { value: 0, currency: request.amount.currency },
          expires_at: new Date().toISOString(),
        };
      }

      // Check for failure injection (testing)
      const shouldFail = await checkFailureInjection(db, 'FAUXVISA', request.amount.value);
      if (shouldFail) {
        return {
          authorization_id: generateAuthorizationId(),
          status: 'DECLINED' as AuthorizationStatus,
          decline_reason: shouldFail as DeclineReason,
          amount_authorized: { value: 0, currency: request.amount.currency },
          expires_at: new Date().toISOString(),
        };
      }

      // Create authorization
      const authorizationId = generateAuthorizationId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Place hold on customer account
      await db.batch([
        db.prepare(
          `INSERT INTO authorizations (
            id, merchant_account_id, card_token, customer_account_id,
            amount, currency, status, order_reference, capture_mode,
            metadata, created_at, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          authorizationId,
          request.merchant_account,
          request.card_token,
          customerAccountId,
          request.amount.value,
          request.amount.currency,
          'APPROVED',
          request.order_reference || null,
          request.capture_mode,
          request.metadata ? JSON.stringify(request.metadata) : null,
          now.toISOString(),
          expiresAt.toISOString()
        ),

        // Place hold on customer account
        db.prepare(
          `UPDATE accounts SET
            balance_available = balance_available - ?,
            balance_held = balance_held + ?,
            updated_at = ?
           WHERE id = ?`
        ).bind(request.amount.value, request.amount.value, now.toISOString(), customerAccountId),
      ]);

      return {
        authorization_id: authorizationId,
        status: 'APPROVED' as AuthorizationStatus,
        amount_authorized: request.amount,
        expires_at: expiresAt.toISOString(),
      };
    },

    async capture(request: CaptureRequest, agentId?: string) {
      const authorization = await this.getAuthorization(request.authorization_id);

      if (!authorization) {
        throw Errors.validationError({
          authorization_id: ['Authorization not found'],
        });
      }

      if (authorization.status !== 'APPROVED') {
        throw Errors.validationError({
          authorization_id: [`Cannot capture authorization in ${authorization.status} status`],
        });
      }

      // Check if expired
      if (new Date(authorization.expires_at) < new Date()) {
        throw Errors.validationError({
          authorization_id: ['Authorization has expired'],
        });
      }

      // Determine capture amount
      const captureAmount = request.amount?.value || authorization.amount.value;

      if (captureAmount > authorization.amount.value - authorization.amount_captured) {
        throw Errors.validationError({
          amount: ['Capture amount exceeds remaining authorized amount'],
        });
      }

      const now = new Date();
      const settlesAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // T+1

      // Create transaction and update balances
      const transactionId = generateUUID();

      await db.batch([
        // Create transaction record
        db.prepare(
          `INSERT INTO transactions (
            id, type, status, debit_account_id, credit_account_id,
            amount, currency, reference, agent_id, created_at, posted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          transactionId,
          'CAPTURE',
          'POSTED',
          authorization.customer_account_id,
          authorization.merchant_account_id,
          captureAmount,
          authorization.amount.currency,
          authorization.order_reference || null,
          agentId || null,
          now.toISOString(),
          now.toISOString()
        ),

        // Update authorization
        db.prepare(
          `UPDATE authorizations SET
            status = ?,
            amount_captured = amount_captured + ?,
            captured_at = ?,
            transaction_id = ?
           WHERE id = ?`
        ).bind(
          captureAmount >= authorization.amount.value ? 'CAPTURED' : 'APPROVED',
          captureAmount,
          now.toISOString(),
          transactionId,
          request.authorization_id
        ),

        // Update customer account: release hold, debit ledger
        db.prepare(
          `UPDATE accounts SET
            balance_held = balance_held - ?,
            balance_ledger = balance_ledger - ?,
            updated_at = ?
           WHERE id = ?`
        ).bind(captureAmount, captureAmount, now.toISOString(), authorization.customer_account_id),

        // Credit merchant account
        db.prepare(
          `UPDATE accounts SET
            balance_available = balance_available + ?,
            balance_ledger = balance_ledger + ?,
            updated_at = ?
           WHERE id = ?`
        ).bind(captureAmount, captureAmount, now.toISOString(), authorization.merchant_account_id),
      ]);

      return {
        transaction_id: transactionId,
        amount_captured: { value: captureAmount, currency: authorization.amount.currency },
        settles_at: settlesAt.toISOString(),
      };
    },

    async refund(request: RefundRequest, agentId?: string) {
      // Get original transaction
      const originalTransaction = await ledger.getTransaction(request.original_transaction_id);
      if (!originalTransaction) {
        throw Errors.validationError({
          original_transaction_id: ['Transaction not found'],
        });
      }

      if (!['CAPTURE', 'PAYMENT', 'TRANSFER'].includes(originalTransaction.type)) {
        throw Errors.validationError({
          original_transaction_id: ['Cannot refund this transaction type'],
        });
      }

      // Determine refund amount
      const refundAmount = request.amount?.value || originalTransaction.amount.value;

      if (refundAmount > originalTransaction.amount.value) {
        throw Errors.validationError({
          amount: ['Refund amount exceeds original transaction amount'],
        });
      }

      // Process refund (reverse the original: credit original debit, debit original credit)
      const refundTransaction = await ledger.postTransaction({
        type: 'REFUND',
        amount: { value: refundAmount, currency: originalTransaction.amount.currency },
        debit_account: originalTransaction.credit_account, // Merchant
        credit_account: originalTransaction.debit_account, // Customer
        reference: `REFUND-${request.original_transaction_id}`,
        memo: request.reason || 'Refund',
        parent_transaction_id: request.original_transaction_id,
        agent_id: agentId,
      });

      return refundTransaction;
    },

    async void(authorizationId: string, agentId?: string) {
      const authorization = await this.getAuthorization(authorizationId);

      if (!authorization) {
        throw Errors.validationError({
          authorization_id: ['Authorization not found'],
        });
      }

      if (authorization.status !== 'APPROVED') {
        throw Errors.validationError({
          authorization_id: [`Cannot void authorization in ${authorization.status} status`],
        });
      }

      const now = new Date().toISOString();

      // Release hold and update authorization
      await db.batch([
        db.prepare(
          `UPDATE authorizations SET status = 'VOIDED' WHERE id = ?`
        ).bind(authorizationId),

        db.prepare(
          `UPDATE accounts SET
            balance_available = balance_available + ?,
            balance_held = balance_held - ?,
            updated_at = ?
           WHERE id = ?`
        ).bind(
          authorization.amount.value - authorization.amount_captured,
          authorization.amount.value - authorization.amount_captured,
          now,
          authorization.customer_account_id
        ),
      ]);
    },

    async getAuthorization(authorizationId: string): Promise<Authorization | null> {
      const result = await db
        .prepare(`SELECT * FROM authorizations WHERE id = ?`)
        .bind(authorizationId)
        .first();

      if (!result) {
        return null;
      }

      return mapRowToAuthorization(result);
    },

    async simulateChargeback(
      transactionId: string,
      reasonCode: string,
      amount?: Amount,
      agentId?: string
    ) {
      const transaction = await ledger.getTransaction(transactionId);
      if (!transaction) {
        throw Errors.validationError({
          transaction_id: ['Transaction not found'],
        });
      }

      const chargebackAmount = amount?.value || transaction.amount.value;
      const chargebackId = generateAuthorizationId().replace('AUTH', 'CHB');
      const now = new Date();
      const respondBy = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days

      // Create dispute record
      await db
        .prepare(
          `INSERT INTO disputes (
            id, transaction_id, customer_id, reason, status,
            respond_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          chargebackId,
          transactionId,
          'UNKNOWN', // Would normally look up customer
          reasonCode,
          'OPEN',
          respondBy.toISOString(),
          now.toISOString(),
          now.toISOString()
        )
        .run();

      // Debit merchant, credit customer (provisional)
      await ledger.postTransaction({
        type: 'CHARGEBACK',
        amount: { value: chargebackAmount, currency: transaction.amount.currency },
        debit_account: transaction.credit_account, // Merchant
        credit_account: transaction.debit_account, // Customer
        reference: `CHARGEBACK-${transactionId}`,
        memo: `Chargeback: ${reasonCode}`,
        parent_transaction_id: transactionId,
        agent_id: agentId,
      });

      return {
        chargeback_id: chargebackId,
        status: 'OPEN',
        respond_by: respondBy.toISOString(),
      };
    },
  };
}

/**
 * Resolve a card token to an account ID
 * In a real system, this would involve secure token vault lookup
 */
async function resolveCardToken(db: D1Database, cardToken: string): Promise<string | null> {
  // For simulation, we support tokens in format:
  // - CARD-{account_id} - direct account reference
  // - Standard tokens looked up in a token table

  if (cardToken.startsWith('CARD-') && cardToken.includes('-RETL-')) {
    // Extract account ID from token (format: CARD-XX-RETL-XXXXXXXX-XX)
    const accountId = cardToken.substring(5);
    return accountId;
  }

  // Look up in token table (if we had one)
  // For now, return null for unknown tokens
  return null;
}

/**
 * Check if a failure should be injected (for testing)
 */
async function checkFailureInjection(
  db: D1Database,
  network: string,
  amount: number
): Promise<DeclineReason | null> {
  const result = await db
    .prepare(
      `SELECT failure_type, probability, filters FROM failure_injections
       WHERE network = ? AND active = 1 AND expires_at > datetime('now')`
    )
    .bind(network)
    .first();

  if (!result) {
    return null;
  }

  // Check probability
  if (Math.random() > (result.probability as number)) {
    return null;
  }

  // Check filters
  if (result.filters) {
    const filters = JSON.parse(result.filters as string);
    if (filters.amount_above && amount < filters.amount_above) {
      return null;
    }
    if (filters.amount_below && amount > filters.amount_below) {
      return null;
    }
  }

  // Map failure type to decline reason
  const failureMap: Record<string, DeclineReason> = {
    DECLINED: 'INSUFFICIENT_FUNDS',
    FRAUD_SUSPECTED: 'FRAUD_SUSPECTED',
    LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  };

  return failureMap[result.failure_type as string] || 'INSUFFICIENT_FUNDS';
}

/**
 * Map a database row to an Authorization object
 */
function mapRowToAuthorization(row: Record<string, unknown>): Authorization {
  return {
    id: row.id as string,
    merchant_account_id: row.merchant_account_id as string,
    card_token: row.card_token as string,
    customer_account_id: row.customer_account_id as string,
    amount: {
      value: row.amount as number,
      currency: (row.currency as string) || 'FXUSD',
    } as Amount,
    status: row.status as AuthorizationStatus,
    decline_reason: row.decline_reason as DeclineReason | undefined,
    order_reference: row.order_reference as string | undefined,
    capture_mode: (row.capture_mode as 'MANUAL' | 'AUTOMATIC') || 'MANUAL',
    amount_captured: row.amount_captured as number,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    created_at: row.created_at as string,
    expires_at: row.expires_at as string,
    captured_at: row.captured_at as string | undefined,
    transaction_id: row.transaction_id as string | undefined,
  };
}
