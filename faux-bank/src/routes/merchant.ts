import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  CardAuthorizationRequest,
  CaptureRequest,
  RefundRequest,
  formatAmount,
} from '../types';
import { createMerchantService } from '../services/merchant';
import { requireCapability } from '../middleware/auth';
import { checkTransactionRateLimit } from '../middleware/rate-limit';
import { Errors, errorResponse, handleError } from '../utils/errors';

type Env = {
  DB: D1Database;
  SESSIONS: KVNamespace;
};

const merchant = new Hono<{ Bindings: Env }>();

/**
 * POST /commercial/merchant/authorize - Authorize card transaction
 */
merchant.post(
  '/authorize',
  requireCapability('MERCHANT_PROCESSING'),
  zValidator('json', CardAuthorizationRequest),
  async (c) => {
    try {
      const request = c.req.valid('json');
      const agentId = c.get('agentId');

      // Check transaction rate limit
      const withinRateLimit = await checkTransactionRateLimit(c, request.amount.value);
      if (!withinRateLimit) {
        return errorResponse(c, Errors.velocityExceeded('transactions_per_minute'));
      }

      const merchantService = createMerchantService(c.env.DB);
      const result = await merchantService.authorize(request, agentId);

      // Return appropriate status code based on authorization result
      const statusCode = result.status === 'APPROVED' ? 200 : 422;

      return c.json({
        authorization_id: result.authorization_id,
        status: result.status,
        decline_reason: result.decline_reason,
        amount_authorized: formatAmount(result.amount_authorized),
        expires_at: result.expires_at,
      }, statusCode as 200 | 422);
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * POST /commercial/merchant/capture - Capture authorized amount
 */
merchant.post(
  '/capture',
  requireCapability('MERCHANT_PROCESSING'),
  zValidator('json', CaptureRequest),
  async (c) => {
    try {
      const request = c.req.valid('json');
      const agentId = c.get('agentId');

      const merchantService = createMerchantService(c.env.DB);
      const result = await merchantService.capture(request, agentId);

      return c.json({
        transaction_id: result.transaction_id,
        amount_captured: formatAmount(result.amount_captured),
        settles_at: result.settles_at,
      });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * POST /commercial/merchant/refund - Process refund
 */
merchant.post(
  '/refund',
  requireCapability('MERCHANT_PROCESSING'),
  zValidator('json', RefundRequest),
  async (c) => {
    try {
      const request = c.req.valid('json');
      const agentId = c.get('agentId');

      const merchantService = createMerchantService(c.env.DB);
      const transaction = await merchantService.refund(request, agentId);

      return c.json({
        ...transaction,
        amount: formatAmount(transaction.amount),
      });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

// Void request schema
const VoidRequest = z.object({
  authorization_id: z.string(),
});

/**
 * POST /commercial/merchant/void - Void authorization
 */
merchant.post(
  '/void',
  requireCapability('MERCHANT_PROCESSING'),
  zValidator('json', VoidRequest),
  async (c) => {
    try {
      const { authorization_id } = c.req.valid('json');
      const agentId = c.get('agentId');

      const merchantService = createMerchantService(c.env.DB);
      await merchantService.void(authorization_id, agentId);

      return c.json({ success: true });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

// Chargeback request schema
const ChargebackRequest = z.object({
  transaction_id: z.string().uuid(),
  reason_code: z.enum(['FRAUD', 'DUPLICATE', 'NOT_RECEIVED', 'NOT_AS_DESCRIBED', 'CANCELED']),
  amount: z.object({
    value: z.number().int().positive(),
    currency: z.enum(['FXUSD', 'FXEUR', 'FXGBP']).default('FXUSD'),
  }).optional(),
});

/**
 * POST /commercial/merchant/chargeback - Simulate chargeback
 */
merchant.post(
  '/chargeback',
  requireCapability('MERCHANT_PROCESSING'),
  zValidator('json', ChargebackRequest),
  async (c) => {
    try {
      const request = c.req.valid('json');
      const agentId = c.get('agentId');

      const merchantService = createMerchantService(c.env.DB);
      const result = await merchantService.simulateChargeback(
        request.transaction_id,
        request.reason_code,
        request.amount,
        agentId
      );

      return c.json(result, 201);
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

export { merchant };
