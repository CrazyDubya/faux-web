import { api } from './client'
import type { Authorization, PaginatedResponse } from '@/types'

export interface AuthorizeRequest {
  merchant_account: string
  card_account: string
  amount: number
  currency?: string
  merchant_category_code: string
  merchant_name: string
  metadata?: Record<string, unknown>
}

export interface CaptureRequest {
  amount?: number
  metadata?: Record<string, unknown>
}

export interface RefundRequest {
  amount: number
  reason: string
  metadata?: Record<string, unknown>
}

export interface ChargebackRequest {
  reason: string
  evidence?: string[]
}

export interface ListAuthorizationsParams {
  merchant_account?: string
  card_account?: string
  status?: string
  limit?: number
  offset?: number
}

export const merchantApi = {
  authorize(data: AuthorizeRequest): Promise<Authorization> {
    return api.post('/commercial/merchant/authorize', data)
  },

  capture(authorizationId: string, data?: CaptureRequest): Promise<Authorization> {
    return api.post(`/commercial/merchant/capture/${authorizationId}`, data)
  },

  void(authorizationId: string): Promise<Authorization> {
    return api.post(`/commercial/merchant/void/${authorizationId}`)
  },

  refund(authorizationId: string, data: RefundRequest): Promise<Authorization> {
    return api.post(`/commercial/merchant/refund/${authorizationId}`, data)
  },

  chargeback(authorizationId: string, data: ChargebackRequest): Promise<Authorization> {
    return api.post(`/commercial/merchant/chargeback/${authorizationId}`, data)
  },

  list(params?: ListAuthorizationsParams): Promise<PaginatedResponse<Authorization>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.set(key, String(value))
      })
    }
    const queryString = query.toString()
    return api.get(`/commercial/merchant/authorizations${queryString ? `?${queryString}` : ''}`)
  },

  get(authorizationId: string): Promise<Authorization> {
    return api.get(`/commercial/merchant/authorizations/${authorizationId}`)
  },
}
