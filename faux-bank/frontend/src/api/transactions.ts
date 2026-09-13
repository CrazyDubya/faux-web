import { api } from './client'
import type { Transaction, TransactionType } from '@/types'

export interface PostTransactionRequest {
  transaction_type: TransactionType
  debit_account: string
  credit_account: string
  amount: number
  currency?: string
  description: string
  reference_id?: string
  metadata?: Record<string, unknown>
}

export const transactionsApi = {
  post(data: PostTransactionRequest): Promise<Transaction> {
    return api.post('/transactions', data)
  },

  get(transactionId: string): Promise<Transaction> {
    return api.get(`/transactions/${transactionId}`)
  },

  reverse(transactionId: string, reason: string): Promise<Transaction> {
    return api.post(`/transactions/${transactionId}/reverse`, { reason })
  },
}
