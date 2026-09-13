// Account Types
export type AccountType = 'CH' | 'SV' | 'MM' | 'CD' | 'LN' | 'MG' | 'CC' | 'LC' | 'MC' | 'TR' | 'ES' | 'OP'
export type AccountSegment = 'RETL' | 'COMM' | 'GOVT'
export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED' | 'PENDING'
export type FreezeReason = 'FRAUD' | 'COMPLIANCE' | 'CUSTOMER_REQUEST' | 'DECEASED' | 'LEGAL_HOLD'

export interface Account {
  account_id: string
  customer_id: string
  account_type: AccountType
  account_segment: AccountSegment
  currency: string
  status: AccountStatus
  freeze_reason?: FreezeReason
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AccountBalance {
  account_id: string
  available_balance: number
  ledger_balance: number
  pending_credits: number
  pending_debits: number
  held_amount: number
  as_of: string
}

export interface AccountWithBalance extends Account {
  balance: AccountBalance
}

// Transaction Types
export type TransactionType =
  | 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'PAYMENT'
  | 'FEE' | 'INTEREST' | 'ADJUSTMENT' | 'AUTHORIZATION'
  | 'CAPTURE' | 'REFUND' | 'CHARGEBACK' | 'REVERSAL'

export type TransactionStatus = 'PENDING' | 'POSTED' | 'FAILED' | 'REVERSED'

export interface Transaction {
  transaction_id: string
  transaction_type: TransactionType
  debit_account: string
  credit_account: string
  amount: number
  currency: string
  status: TransactionStatus
  description: string
  reference_id?: string
  metadata: Record<string, unknown>
  created_at: string
  posted_at?: string
}

// Agent Types
export type AgentType =
  | 'ECOMMERCE_MERCHANT' | 'CUSTOMER_SERVICE' | 'TREASURY_MANAGEMENT'
  | 'ANALYTICS' | 'COMPLIANCE' | 'ADMIN'

export type AgentCapability =
  | 'ACCOUNT_READ' | 'ACCOUNT_WRITE' | 'BALANCE_READ'
  | 'TRANSACTION_READ' | 'PAYMENT_INITIATE' | 'MERCHANT_PROCESSING'
  | 'WIRE_ORIGINATE' | 'COMPLIANCE_READ' | 'COMPLIANCE_WRITE'

export type AgentStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED'

export interface Agent {
  agent_id: string
  agent_type: AgentType
  name: string
  description: string
  status: AgentStatus
  capabilities: AgentCapability[]
  rate_limit_requests_per_minute: number
  rate_limit_transactions_per_minute: number
  daily_transaction_limit: number
  created_at: string
  updated_at: string
}

// Authorization Types
export type AuthorizationStatus = 'PENDING' | 'CAPTURED' | 'VOIDED' | 'EXPIRED' | 'PARTIAL_CAPTURE'

export interface Authorization {
  authorization_id: string
  merchant_account: string
  card_account: string
  amount: number
  captured_amount: number
  currency: string
  status: AuthorizationStatus
  merchant_category_code: string
  merchant_name: string
  expires_at: string
  created_at: string
}

// Compliance Types
export type KycType = 'IDENTITY' | 'ADDRESS' | 'INCOME' | 'BUSINESS'
export type KycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED'

export interface KycVerification {
  verification_id: string
  customer_id: string
  verification_type: KycType
  status: KycStatus
  documents: string[]
  notes?: string
  verified_by?: string
  created_at: string
  verified_at?: string
  expires_at?: string
}

export type DisputeType =
  | 'UNAUTHORIZED' | 'DUPLICATE' | 'WRONG_AMOUNT'
  | 'NOT_RECEIVED' | 'DEFECTIVE' | 'FRAUD' | 'OTHER'

export type DisputeStatus =
  | 'OPEN' | 'INVESTIGATING' | 'RESOLVED_MERCHANT'
  | 'RESOLVED_CUSTOMER' | 'CLOSED'

export interface Dispute {
  dispute_id: string
  transaction_id: string
  account_id: string
  dispute_type: DisputeType
  status: DisputeStatus
  amount: number
  currency: string
  description: string
  provisional_credit_issued: boolean
  evidence: string[]
  resolution_notes?: string
  created_at: string
  updated_at: string
  resolved_at?: string
}

// Testing Types
export type FailureType = 'DECLINED' | 'TIMEOUT' | 'NETWORK_ERROR' | 'DUPLICATE_DETECTED'

export interface FailureInjection {
  failure_id: string
  failure_type: FailureType
  probability: number
  duration_seconds: number
  affected_endpoints?: string[]
  created_at: string
  expires_at: string
}

export interface SimulatedTime {
  current_time: string
  real_time: string
  offset_seconds: number
}

// API Response Types
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  trace_id: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

// Dashboard Metrics
export interface SystemMetrics {
  total_accounts: number
  active_accounts: number
  total_transactions_today: number
  total_volume_today: number
  pending_authorizations: number
  open_disputes: number
  active_agents: number
  pending_kyc: number
}

// Customer Types
export type CustomerType = 'INDIVIDUAL' | 'BUSINESS' | 'AGENT' | 'SYSTEM'

export interface Customer {
  customer_id: string
  customer_type: CustomerType
  name: string
  email?: string
  phone?: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
