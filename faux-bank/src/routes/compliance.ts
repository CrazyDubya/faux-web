import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  OpenDisputeRequest,
  KycVerificationRequest,
  DisputeStatus,
  formatAmount,
} from '../types';
import { createComplianceService } from '../services/compliance';
import { requireCapability } from '../middleware/auth';
import { Errors, errorResponse, handleError } from '../utils/errors';

type Env = {
  DB: D1Database;
  SESSIONS: KVNamespace;
};

const compliance = new Hono<{ Bindings: Env }>();

// ============ KYC ENDPOINTS ============

/**
 * POST /compliance/kyc/verify - Submit KYC verification
 */
compliance.post(
  '/kyc/verify',
  requireCapability('COMPLIANCE_WRITE'),
  zValidator('json', KycVerificationRequest),
  async (c) => {
    try {
      const request = c.req.valid('json');
      const complianceService = createComplianceService(c.env.DB);

      const result = await complianceService.submitKycVerification(request);

      return c.json(result, 202);
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * GET /compliance/kyc/:verificationId/status - Get verification status
 */
compliance.get(
  '/kyc/:verificationId/status',
  requireCapability('COMPLIANCE_READ'),
  async (c) => {
    try {
      const verificationId = c.req.param('verificationId');
      const complianceService = createComplianceService(c.env.DB);

      const verification = await complianceService.getKycVerification(verificationId);

      if (!verification) {
        return errorResponse(c, Errors.validationError({
          verification_id: ['Verification not found'],
        }));
      }

      return c.json({
        verification_id: verification.id,
        customer_id: verification.customer_id,
        verification_type: verification.verification_type,
        status: verification.status,
        created_at: verification.created_at,
        updated_at: verification.updated_at,
        expires_at: verification.expires_at,
      });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

// ============ DISPUTE ENDPOINTS ============

/**
 * POST /compliance/disputes - Open dispute
 */
compliance.post(
  '/disputes',
  requireCapability('COMPLIANCE_WRITE'),
  zValidator('json', OpenDisputeRequest),
  async (c) => {
    try {
      const request = c.req.valid('json');
      const complianceService = createComplianceService(c.env.DB);

      // Get customer ID from agent context or request
      // For now, use a placeholder - in production, this would come from authenticated session
      const customerId = 'CUST-UNKNOWN';

      const result = await complianceService.openDispute(request, customerId);

      return c.json({
        dispute_id: result.dispute_id,
        status: result.status,
        provisional_credit: result.provisional_credit
          ? formatAmount(result.provisional_credit)
          : undefined,
        respond_by: result.respond_by,
      }, 201);
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

/**
 * GET /compliance/disputes/:disputeId - Get dispute details
 */
compliance.get(
  '/disputes/:disputeId',
  requireCapability('COMPLIANCE_READ'),
  async (c) => {
    try {
      const disputeId = c.req.param('disputeId');
      const complianceService = createComplianceService(c.env.DB);

      const dispute = await complianceService.getDispute(disputeId);

      if (!dispute) {
        return errorResponse(c, Errors.validationError({
          dispute_id: ['Dispute not found'],
        }));
      }

      return c.json({
        ...dispute,
        provisional_credit_amount: dispute.provisional_credit_amount
          ? formatAmount({ value: dispute.provisional_credit_amount, currency: 'FXUSD' })
          : undefined,
      });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

// List disputes query params
const ListDisputesQuery = z.object({
  customer_id: z.string().optional(),
  status: DisputeStatus.optional(),
});

/**
 * GET /compliance/disputes - List disputes
 */
compliance.get(
  '/disputes',
  requireCapability('COMPLIANCE_READ'),
  zValidator('query', ListDisputesQuery),
  async (c) => {
    try {
      const query = c.req.valid('query');
      const complianceService = createComplianceService(c.env.DB);

      const disputes = await complianceService.listDisputes(query);

      return c.json({
        disputes: disputes.map(d => ({
          ...d,
          provisional_credit_amount: d.provisional_credit_amount
            ? formatAmount({ value: d.provisional_credit_amount, currency: 'FXUSD' })
            : undefined,
        })),
      });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

// Evidence submission schema
const EvidenceRequest = z.object({
  evidence_type: z.string(),
  description: z.string(),
  documents: z.array(z.object({
    type: z.string(),
    reference: z.string(),
  })).optional(),
  notes: z.string().optional(),
});

/**
 * POST /compliance/disputes/:disputeId/evidence - Submit evidence
 */
compliance.post(
  '/disputes/:disputeId/evidence',
  requireCapability('COMPLIANCE_WRITE'),
  zValidator('json', EvidenceRequest),
  async (c) => {
    try {
      const disputeId = c.req.param('disputeId');
      const evidence = c.req.valid('json');
      const complianceService = createComplianceService(c.env.DB);

      await complianceService.submitEvidence(disputeId, evidence);

      return c.json({ success: true, status: 'UNDER_REVIEW' });
    } catch (error) {
      return errorResponse(c, handleError(error));
    }
  }
);

export { compliance };
