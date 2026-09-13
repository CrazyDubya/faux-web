import { api } from './client'
import type { KycVerification, Dispute, KycType, DisputeType, PaginatedResponse } from '@/types'

export interface SubmitKycRequest {
  customer_id: string
  verification_type: KycType
  documents: string[]
  metadata?: Record<string, unknown>
}

export interface OpenDisputeRequest {
  transaction_id: string
  account_id: string
  dispute_type: DisputeType
  amount: number
  description: string
  evidence?: string[]
}

export interface SubmitEvidenceRequest {
  evidence_type: string
  content: string
  metadata?: Record<string, unknown>
}

export interface ListDisputesParams {
  account_id?: string
  status?: string
  dispute_type?: DisputeType
  limit?: number
  offset?: number
}

export interface ListKycParams {
  customer_id?: string
  status?: string
  verification_type?: KycType
  limit?: number
  offset?: number
}

export const complianceApi = {
  // KYC
  submitKyc(data: SubmitKycRequest): Promise<KycVerification> {
    return api.post('/compliance/kyc/verify', data)
  },

  getKycStatus(verificationId: string): Promise<KycVerification> {
    return api.get(`/compliance/kyc/${verificationId}/status`)
  },

  listKyc(params?: ListKycParams): Promise<PaginatedResponse<KycVerification>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.set(key, String(value))
      })
    }
    const queryString = query.toString()
    return api.get(`/compliance/kyc${queryString ? `?${queryString}` : ''}`)
  },

  approveKyc(verificationId: string, notes?: string): Promise<KycVerification> {
    return api.post(`/compliance/kyc/${verificationId}/approve`, { notes })
  },

  rejectKyc(verificationId: string, reason: string): Promise<KycVerification> {
    return api.post(`/compliance/kyc/${verificationId}/reject`, { reason })
  },

  // Disputes
  openDispute(data: OpenDisputeRequest): Promise<Dispute> {
    return api.post('/compliance/disputes', data)
  },

  getDispute(disputeId: string): Promise<Dispute> {
    return api.get(`/compliance/disputes/${disputeId}`)
  },

  listDisputes(params?: ListDisputesParams): Promise<PaginatedResponse<Dispute>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.set(key, String(value))
      })
    }
    const queryString = query.toString()
    return api.get(`/compliance/disputes${queryString ? `?${queryString}` : ''}`)
  },

  submitEvidence(disputeId: string, data: SubmitEvidenceRequest): Promise<Dispute> {
    return api.post(`/compliance/disputes/${disputeId}/evidence`, data)
  },

  resolveDispute(
    disputeId: string,
    resolution: 'RESOLVED_MERCHANT' | 'RESOLVED_CUSTOMER',
    notes: string
  ): Promise<Dispute> {
    return api.post(`/compliance/disputes/${disputeId}/resolve`, { resolution, notes })
  },
}
