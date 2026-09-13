import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  CreateTransactionRequest,
  TransactionType,
  formatAmount,
} from '../types';
import { createLedgerService } from '../services/ledger';
import { requireCapability, requireAccountAccess, validateTransactionAccess } from '../middleware/auth';
import { checkTransactionRateLimit, checkDailyAmountLimit } from '../middleware/rate-limit';
import { Errors, errorResponse, handleError } from '../utils/errors';

type Env = {
  DB: D1Database;
  SESSIONS: KVNamespace;
};

const transactions = new Hono<{ Bindings: Env }>();

/**
 * POST /transactions - Post a transaction
 * SECURITY FIX: Added account access validation for transaction accounts
 */
transactions.post(
  '/',
  requireCapability('PAYMENT_INITIATE'),
  zValidator('json', CreateTransactionRequest),
  async (c) => {
    try {
      const request = c.req.valid('json');
      const agentId = c.get('agentId');

      // SECURITY FIX: Validate agent has access to the transaction accounts
      const hasAccess = await validateTransactionAccess(
        c,
        request.debit_account,
        request.credit_account
      );
      if (!hasAccess) {
        return errorResponse(c, Errors.insufficientPermissions(
          'Agent does not have access to the specified accounts'
        ));
      }

      // Check transaction rate limit
      const withinRateLimit = await checkTransactionRateLimit(c, request.amount.value);
      if (!withinRateLimit) {
        return errorResponse(c, Errors.velocityExceeded('transactions_per_minute'));
      }

      // Check daily amount limit
      const withinDailyLimit = await checkDailyAmountLimit(c, request.amount.value);
      if (!withinDailyLimit) {
        return errorResponse(c, Errors.limitExceeded('daily_amount', 0, request.amount.value));
      }

      const ledgerService = createLedgerService(c.env.DB);

      const transaction = await ledgerService.postTransaction({
        ...request,
        agent_id: agentId,
      });

      // Format amount for response
      const response = {
        ...transaction,
        amount: formatAmount(transaction.amount),
      };

      return c.json(response, 201);
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * GET /transactions/:transactionId - Get transaction details
 * SECURITY FIX: Added access control check for transaction accounts
 */
transactions.get(
  '/:transactionId',
  requireCapability('TRANSACTION_READ'),
  async (c) => {
    try {
      const transactionId = c.req.param('transactionId');
      const ledgerService = createLedgerService(c.env.DB);

      const transaction = await ledgerService.getTransaction(transactionId);

      if (!transaction) {
        return errorResponse(c, Errors.validationError({
          transaction_id: ['Transaction not found'],
        }));
      }

      // SECURITY FIX: Verify agent has access to the transaction's accounts
      const hasAccess = await validateTransactionAccess(
        c,
        transaction.debit_account,
        transaction.credit_account
      );
      if (!hasAccess) {
        return errorResponse(c, Errors.insufficientPermissions(
          'Agent does not have access to this transaction'
        ));
      }

      // Format amount for response
      const response = {
        ...transaction,
        amount: formatAmount(transaction.amount),
      };

      return c.json(response);
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

// Query params schema for transaction history
const TransactionHistoryQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  type: TransactionType.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  cursor: z.string().optional(),
});

/**
 * GET /accounts/:accountId/transactions - Get transaction history
 * SECURITY FIX: Added account access control check
 */
transactions.get(
  '/accounts/:accountId/transactions',
  requireCapability('TRANSACTION_READ'),
  requireAccountAccess('accountId'),
  zValidator('query', TransactionHistoryQuery),
  async (c) => {
    try {
      const accountId = c.req.param('accountId');
      const query = c.req.valid('query');
      const ledgerService = createLedgerService(c.env.DB);

      const result = await ledgerService.getTransactionHistory(accountId, {
        from: query.from,
        to: query.to,
        type: query.type,
        limit: query.limit,
        cursor: query.cursor,
      });

      // Format amounts for response
      const transactions = result.transactions.map(tx => ({
        ...tx,
        amount: formatAmount(tx.amount),
      }));

      return c.json({
        transactions,
        next_cursor: result.next_cursor,
      });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

export { transactions };
