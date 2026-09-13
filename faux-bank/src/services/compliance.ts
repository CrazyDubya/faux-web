import { D1Database } from '@cloudflare/workers-types';
import {
  Dispute,
  DisputeStatus,
  DisputeReason,
  KycVerification,
  KycStatus,
  KycVerificationType,
  OpenDisputeRequest,
  KycVerificationRequest,
  Amount,
} from '../types';
import { generateDisputeId, generateKycId, generateUUID } from '../utils/ids';
import { Errors } from '../utils/errors';
import { createLedgerService } from './ledger';

/**
 * Compliance Service
 *
 * Handles disputes, KYC verification, and compliance-related operations.
 */

export interface ComplianceService {
  // Disputes
  openDispute(request: OpenDisputeRequest, customerId: string): Promise<{
    dispute_id: string;
    status: DisputeStatus;
    provisional_credit?: Amount;
    respond_by: string;
  }>;
  getDispute(disputeId: string): Promise<Dispute | null>;
  listDisputes(options?: { customer_id?: string; status?: DisputeStatus }): Promise<Dispute[]>;
  submitEvidence(disputeId: string, evidence: Record<string, unknown>): Promise<void>;
  resolveDispute(disputeId: string, resolution: 'CUSTOMER' | 'MERCHANT', notes?: string): Promise<void>;

  // KYC
  submitKycVerification(request: KycVerificationRequest): Promise<{
    verification_id: string;
    status: KycStatus;
  }>;
  getKycVerification(verificationId: string): Promise<KycVerification | null>;
  getKycStatus(customerId: string): Promise<KycStatus>;
  reviewKyc(verificationId: string, approved: boolean, notes?: string): Promise<void>;
}

export function createComplianceService(db: D1Database): ComplianceService {
  const ledger = createLedgerService(db);

  return {
    async openDispute(request: OpenDisputeRequest, customerId: string) {
      // Validate transaction exists
      const transaction = await ledger.getTransaction(request.transaction_id);
      if (!transaction) {
        throw Errors.validationError({
          transaction_id: ['Transaction not found'],
        });
      }

      // Check if dispute already exists
      const existing = await db
        .prepare(`SELECT id FROM disputes WHERE transaction_id = ? AND status NOT IN ('RESOLVED_CUSTOMER', 'RESOLVED_MERCHANT')`)
        .bind(request.transaction_id)
        .first();

      if (existing) {
        throw Errors.validationError({
          transaction_id: ['An open dispute already exists for this transaction'],
        });
      }

      const disputeId = generateDisputeId();
      const now = new Date();
      const respondBy = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days

      // Determine if provisional credit should be issued (Reg E simulation)
      let provisionalCredit: Amount | undefined;
      let provisionalCreditTxId: string | undefined;

      // Issue provisional credit for consumer disputes under F$500
      if (transaction.amount.value <= 50000) {
        provisionalCredit = transaction.amount;

        // Create provisional credit transaction
        const creditTx = await ledger.postTransaction({
          type: 'ADJUSTMENT',
          amount: transaction.amount,
          debit_account: 'CH-COMM-SEEDBANK-AA', // System account
          credit_account: transaction.debit_account, // Customer
          reference: `PROVISIONAL-${disputeId}`,
          memo: 'Provisional credit pending dispute resolution',
        });

        provisionalCreditTxId = creditTx.id;
      }

      await db
        .prepare(
          `INSERT INTO disputes (
            id, transaction_id, customer_id, reason, description, status,
            provisional_credit_amount, provisional_credit_transaction_id,
            respond_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          disputeId,
          request.transaction_id,
          customerId,
          request.reason,
          request.description || null,
          'OPEN',
          provisionalCredit?.value || null,
          provisionalCreditTxId || null,
          respondBy.toISOString(),
          now.toISOString(),
          now.toISOString()
        )
        .run();

      return {
        dispute_id: disputeId,
        status: 'OPEN' as DisputeStatus,
        provisional_credit: provisionalCredit,
        respond_by: respondBy.toISOString(),
      };
    },

    async getDispute(disputeId: string): Promise<Dispute | null> {
      const result = await db
        .prepare(`SELECT * FROM disputes WHERE id = ?`)
        .bind(disputeId)
        .first();

      if (!result) {
        return null;
      }

      return mapRowToDispute(result);
    },

    async listDisputes(options?: { customer_id?: string; status?: DisputeStatus }): Promise<Dispute[]> {
      let query = `SELECT * FROM disputes WHERE 1=1`;
      const params: unknown[] = [];

      if (options?.customer_id) {
        query += ` AND customer_id = ?`;
        params.push(options.customer_id);
      }

      if (options?.status) {
        query += ` AND status = ?`;
        params.push(options.status);
      }

      query += ` ORDER BY created_at DESC LIMIT 100`;

      const results = await db.prepare(query).bind(...params).all();

      return (results.results || []).map(mapRowToDispute);
    },

    async submitEvidence(disputeId: string, evidence: Record<string, unknown>): Promise<void> {
      const dispute = await this.getDispute(disputeId);
      if (!dispute) {
        throw Errors.validationError({
          dispute_id: ['Dispute not found'],
        });
      }

      if (!['OPEN', 'EVIDENCE_NEEDED'].includes(dispute.status)) {
        throw Errors.validationError({
          dispute_id: ['Cannot submit evidence for dispute in current status'],
        });
      }

      const now = new Date().toISOString();
      const metadata = {
        ...dispute.metadata,
        evidence: [...(dispute.metadata?.evidence as unknown[] || []), { submitted_at: now, ...evidence }],
      };

      await db
        .prepare(
          `UPDATE disputes SET status = 'UNDER_REVIEW', metadata = ?, updated_at = ? WHERE id = ?`
        )
        .bind(JSON.stringify(metadata), now, disputeId)
        .run();
    },

    async resolveDispute(disputeId: string, resolution: 'CUSTOMER' | 'MERCHANT', notes?: string): Promise<void> {
      const dispute = await this.getDispute(disputeId);
      if (!dispute) {
        throw Errors.validationError({
          dispute_id: ['Dispute not found'],
        });
      }

      const now = new Date().toISOString();
      const status = resolution === 'CUSTOMER' ? 'RESOLVED_CUSTOMER' : 'RESOLVED_MERCHANT';

      // If resolved in merchant's favor and provisional credit was issued, reverse it
      if (resolution === 'MERCHANT' && dispute.provisional_credit_transaction_id) {
        const transaction = await ledger.getTransaction(dispute.transaction_id);
        if (transaction && dispute.provisional_credit_amount) {
          // Reverse provisional credit
          await ledger.postTransaction({
            type: 'ADJUSTMENT',
            amount: { value: dispute.provisional_credit_amount, currency: 'FXUSD' },
            debit_account: transaction.debit_account, // Customer
            credit_account: 'CH-COMM-SEEDBANK-AA', // System account
            reference: `REVERSE-PROVISIONAL-${disputeId}`,
            memo: 'Provisional credit reversed - dispute resolved in merchant favor',
            parent_transaction_id: dispute.provisional_credit_transaction_id,
          });
        }
      }

      await db
        .prepare(
          `UPDATE disputes SET status = ?, resolution = ?, resolved_at = ?, updated_at = ? WHERE id = ?`
        )
        .bind(status, notes || `Resolved in ${resolution.toLowerCase()} favor`, now, now, disputeId)
        .run();
    },

    async submitKycVerification(request: KycVerificationRequest) {
      const verificationId = generateKycId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

      await db
        .prepare(
          `INSERT INTO kyc_verifications (
            id, customer_id, verification_type, status, documents,
            created_at, updated_at, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          verificationId,
          request.customer_id,
          request.verification_type,
          'PENDING',
          request.documents ? JSON.stringify(request.documents) : null,
          now.toISOString(),
          now.toISOString(),
          expiresAt.toISOString()
        )
        .run();

      // Simulate auto-approval for testing (80% approval rate)
      if (Math.random() < 0.8) {
        setTimeout(async () => {
          await this.reviewKyc(verificationId, true, 'Auto-approved by simulation');
        }, 1000);
      }

      return {
        verification_id: verificationId,
        status: 'PENDING' as KycStatus,
      };
    },

    async getKycVerification(verificationId: string): Promise<KycVerification | null> {
      const result = await db
        .prepare(`SELECT * FROM kyc_verifications WHERE id = ?`)
        .bind(verificationId)
        .first();

      if (!result) {
        return null;
      }

      return mapRowToKycVerification(result);
    },

    async getKycStatus(customerId: string): Promise<KycStatus> {
      // Check for any approved verifications
      const result = await db
        .prepare(
          `SELECT status FROM kyc_verifications
           WHERE customer_id = ? AND status = 'APPROVED' AND expires_at > datetime('now')
           LIMIT 1`
        )
        .bind(customerId)
        .first();

      if (result) {
        return 'APPROVED';
      }

      // Check for pending
      const pending = await db
        .prepare(
          `SELECT status FROM kyc_verifications
           WHERE customer_id = ? AND status = 'PENDING'
           LIMIT 1`
        )
        .bind(customerId)
        .first();

      if (pending) {
        return 'PENDING';
      }

      return 'PENDING'; // Default to pending if no verifications exist
    },

    async reviewKyc(verificationId: string, approved: boolean, notes?: string): Promise<void> {
      const verification = await this.getKycVerification(verificationId);
      if (!verification) {
        throw Errors.validationError({
          verification_id: ['Verification not found'],
        });
      }

      const now = new Date().toISOString();
      const status = approved ? 'APPROVED' : 'REJECTED';

      await db.batch([
        db.prepare(
          `UPDATE kyc_verifications SET status = ?, review_notes = ?, updated_at = ? WHERE id = ?`
        ).bind(status, notes || null, now, verificationId),

        // Update customer KYC status if approved
        ...(approved
          ? [
              db.prepare(
                `UPDATE customers SET kyc_status = 'VERIFIED', kyc_verified_at = ? WHERE id = ?`
              ).bind(now, verification.customer_id),
            ]
          : []),
      ]);
    },
  };
}

/**
 * Map a database row to a Dispute object
 */
function mapRowToDispute(row: Record<string, unknown>): Dispute {
  return {
    id: row.id as string,
    transaction_id: row.transaction_id as string,
    customer_id: row.customer_id as string,
    reason: row.reason as DisputeReason,
    description: row.description as string | undefined,
    status: row.status as DisputeStatus,
    provisional_credit_amount: row.provisional_credit_amount as number | undefined,
    provisional_credit_transaction_id: row.provisional_credit_transaction_id as string | undefined,
    resolution: row.resolution as string | undefined,
    resolved_at: row.resolved_at as string | undefined,
    respond_by: row.respond_by as string,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/**
 * Map a database row to a KycVerification object
 */
function mapRowToKycVerification(row: Record<string, unknown>): KycVerification {
  return {
    id: row.id as string,
    customer_id: row.customer_id as string,
    verification_type: row.verification_type as KycVerificationType,
    status: row.status as KycStatus,
    documents: row.documents ? JSON.parse(row.documents as string) : undefined,
    reviewed_by: row.reviewed_by as string | undefined,
    review_notes: row.review_notes as string | undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    expires_at: row.expires_at as string | undefined,
  };
}
