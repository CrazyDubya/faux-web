import { api } from './client'
import type {
  Account,
  AccountBalance,
  AccountWithBalance,
  AccountType,
  AccountSegment,
  FreezeReason,
  Transaction,
  PaginatedResponse,
} from '@/types'

export interface CreateAccountRequest {
  customer_id: string
  account_type: AccountType
  account_segment: AccountSegment
  currency?: string
  initial_deposit?: number
  metadata?: Record<string, unknown>
}

export interface UpdateAccountRequest {
  metadata?: Record<string, unknown>
}

export interface ListAccountsParams {
  customer_id?: string
  account_type?: AccountType
  status?: string
  limit?: number
  offset?: number
}

export interface ListTransactionsParams {
  transaction_type?: string
  status?: string
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

export const accountsApi = {
  create(data: CreateAccountRequest): Promise<Account> {
    return api.post('/accounts', data)
  },

  get(accountId: string): Promise<AccountWithBalance> {
    return api.get(`/accounts/${accountId}`)
  },

  update(accountId: string, data: UpdateAccountRequest): Promise<Account> {
    return api.patch(`/accounts/${accountId}`, data)
  },

  list(params?: ListAccountsParams): Promise<PaginatedResponse<Account>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.set(key, String(value))
      })
    }
    const queryString = query.toString()
    return api.get(`/accounts${queryString ? `?${queryString}` : ''}`)
  },

  getBalance(accountId: string): Promise<AccountBalance> {
    return api.get(`/accounts/${accountId}/balance`)
  },

  freeze(accountId: string, reason: FreezeReason, notes?: string): Promise<Account> {
    return api.post(`/accounts/${accountId}/freeze`, { reason, notes })
  },

  unfreeze(accountId: string): Promise<Account> {
    return api.post(`/accounts/${accountId}/unfreeze`)
  },

  close(accountId: string, reason?: string): Promise<Account> {
    return api.post(`/accounts/${accountId}/close`, { reason })
  },

  getTransactions(
    accountId: string,
    params?: ListTransactionsParams
  ): Promise<PaginatedResponse<Transaction>> {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.set(key, String(value))
      })
    }
    const queryString = query.toString()
    return api.get(`/accounts/${accountId}/transactions${queryString ? `?${queryString}` : ''}`)
  },
}
