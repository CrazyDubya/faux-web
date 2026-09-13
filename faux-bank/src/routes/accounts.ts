import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  CreateAccountRequest,
  UpdateAccountRequest,
  FreezeAccountRequest,
  formatAmount,
} from '../types';
import { createAccountService } from '../services/accounts';
import { createLedgerService } from '../services/ledger';
import { requireCapability, requireAccountAccess } from '../middleware/auth';
import { Errors, errorResponse, handleError } from '../utils/errors';
import { isValidAccountId } from '../utils/account-id';

type Env = {
  DB: D1Database;
  SESSIONS: KVNamespace;
};

const accounts = new Hono<{ Bindings: Env }>();

/**
 * POST /accounts - Create new account
 */
accounts.post(
  '/',
  requireCapability('ACCOUNT_WRITE'),
  zValidator('json', CreateAccountRequest),
  async (c) => {
    try {
      const request = c.req.valid('json');
      const agentId = c.get('agentId');
      const accountService = createAccountService(c.env.DB);

      const account = await accountService.createAccount(request, agentId);

      // Format balances for response
      const response = {
        ...account,
        balances: {
          available: formatAmount(account.balances.available),
          ledger: formatAmount(account.balances.ledger),
          pending: formatAmount(account.balances.pending),
          held: formatAmount(account.balances.held),
        },
      };

      return c.json(response, 201);
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * GET /accounts/:accountId - Get account details
 * SECURITY FIX: Added account access control check
 */
accounts.get(
  '/:accountId',
  requireCapability('ACCOUNT_READ'),
  requireAccountAccess('accountId'),
  async (c) => {
    try {
      const accountId = c.req.param('accountId');

      if (!isValidAccountId(accountId)) {
        return errorResponse(c, Errors.invalidAccountFormat(accountId));
      }

      const accountService = createAccountService(c.env.DB);
      const account = await accountService.getAccount(accountId);

      if (!account) {
        return errorResponse(c, Errors.accountNotFound(accountId));
      }

      // Format balances for response
      const response = {
        ...account,
        balances: {
          available: formatAmount(account.balances.available),
          ledger: formatAmount(account.balances.ledger),
          pending: formatAmount(account.balances.pending),
          held: formatAmount(account.balances.held),
        },
      };

      return c.json(response);
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * PATCH /accounts/:accountId - Update account
 * SECURITY FIX: Added account access control check
 */
accounts.patch(
  '/:accountId',
  requireCapability('ACCOUNT_WRITE'),
  requireAccountAccess('accountId'),
  zValidator('json', UpdateAccountRequest),
  async (c) => {
    try {
      const accountId = c.req.param('accountId');
      const request = c.req.valid('json');

      if (!isValidAccountId(accountId)) {
        return errorResponse(c, Errors.invalidAccountFormat(accountId));
      }

      const accountService = createAccountService(c.env.DB);
      const account = await accountService.updateAccount(accountId, request);

      // Format balances for response
      const response = {
        ...account,
        balances: {
          available: formatAmount(account.balances.available),
          ledger: formatAmount(account.balances.ledger),
          pending: formatAmount(account.balances.pending),
          held: formatAmount(account.balances.held),
        },
      };

      return c.json(response);
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * GET /accounts/:accountId/balance - Get current balances
 * SECURITY FIX: Added account access control check
 */
accounts.get(
  '/:accountId/balance',
  requireCapability('BALANCE_READ'),
  requireAccountAccess('accountId'),
  async (c) => {
    try {
      const accountId = c.req.param('accountId');

      if (!isValidAccountId(accountId)) {
        return errorResponse(c, Errors.invalidAccountFormat(accountId));
      }

      const ledgerService = createLedgerService(c.env.DB);
      const balances = await ledgerService.getBalance(accountId);

      return c.json({
        account_id: accountId,
        as_of: new Date().toISOString(),
        available: formatAmount(balances.available),
        ledger: formatAmount(balances.ledger),
        pending: formatAmount(balances.pending),
        held: formatAmount(balances.held),
      });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * POST /accounts/:accountId/freeze - Freeze account
 * SECURITY FIX: Added account access control check
 */
accounts.post(
  '/:accountId/freeze',
  requireCapability('ACCOUNT_WRITE'),
  requireAccountAccess('accountId'),
  zValidator('json', FreezeAccountRequest),
  async (c) => {
    try {
      const accountId = c.req.param('accountId');
      const request = c.req.valid('json');

      if (!isValidAccountId(accountId)) {
        return errorResponse(c, Errors.invalidAccountFormat(accountId));
      }

      const accountService = createAccountService(c.env.DB);
      await accountService.freezeAccount(accountId, request);

      return c.json({ success: true, status: 'FROZEN' });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * POST /accounts/:accountId/close - Close account
 * SECURITY FIX: Added account access control check
 */
accounts.post(
  '/:accountId/close',
  requireCapability('ACCOUNT_WRITE'),
  requireAccountAccess('accountId'),
  async (c) => {
    try {
      const accountId = c.req.param('accountId');

      if (!isValidAccountId(accountId)) {
        return errorResponse(c, Errors.invalidAccountFormat(accountId));
      }

      const accountService = createAccountService(c.env.DB);
      await accountService.closeAccount(accountId);

      return c.json({ success: true, status: 'CLOSED' });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

export { accounts };
