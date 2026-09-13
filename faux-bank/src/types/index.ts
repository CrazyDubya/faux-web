import { z } from 'zod';

// =============================================================================
// ACCOUNT TYPES
// =============================================================================

export const AccountTypeCode = z.enum(['CH', 'SV', 'MM', 'CD', 'LN', 'MG', 'CC', 'LC', 'MC', 'TR', 'ES', 'OP']);
export type AccountTypeCode = z.infer<typeof AccountTypeCode>;

export const AccountTypeName: Record<AccountTypeCode, string> = {
  CH: 'Checking',
  SV: 'Savings',
  MM: 'Money Market',
  CD: 'Certificate of Deposit',
  LN: 'Loan',
  MG: 'Mortgage',
  CC: 'Credit Card',
  LC: 'Line of Credit',
  MC: 'Merchant Account',
  TR: 'Trust Account',
  ES: 'Escrow',
  OP: 'Operating Account',
};

export const SegmentCode = z.enum(['RETL', 'COMM', 'GOVT']);
export type SegmentCode = z.infer<typeof SegmentCode>;

export const SegmentName: Record<SegmentCode, string> = {
  RETL: 'Retail',
  COMM: 'Commercial',
  GOVT: 'Government',
};

export const AccountStatus = z.enum(['ACTIVE', 'FROZEN', 'CLOSED', 'PENDING']);
export type AccountStatus = z.infer<typeof AccountStatus>;

export const CurrencyCode = z.enum(['FXUSD', 'FXEUR', 'FXGBP']);
export type CurrencyCode = z.infer<typeof CurrencyCode>;

// Account ID pattern: XX-XXXX-XXXXXXXX-XX (all alpha)
export const AccountIdPattern = /^[A-Z]{2}-[A-Z]{4}-[A-Z]{8}-[A-Z]{2}$/;
export const AccountId = z.string().regex(AccountIdPattern, 'Invalid account ID format. Must be: XX-XXXX-XXXXXXXX-XX (all uppercase letters)');
export type AccountId = z.infer<typeof AccountId>;

// =============================================================================
// AMOUNT
// =============================================================================

export const Amount = z.object({
  value: z.number().int().nonnegative(),
  currency: CurrencyCode.default('FXUSD'),
});
export type Amount = z.infer<typeof Amount>;

export interface AmountWithDisplay extends Amount {
  display: string;
}

export function formatAmount(amount: Amount): AmountWithDisplay {
  const symbols: Record<CurrencyCode, string> = {
    FXUSD: 'F$',
    FXEUR: 'F€',
    FXGBP: 'F£',
  };
  const symbol = symbols[amount.currency];
  const formatted = (amount.value / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return {
    ...amount,
    display: `${symbol}${formatted}`,
  };
}

// =============================================================================
// ACCOUNT
// =============================================================================

export const AccountBalances = z.object({
  available: Amount,
  ledger: Amount,
  pending: Amount,
  held: Amount,
});
export type AccountBalances = z.infer<typeof AccountBalances>;

export const Account = z.object({
  id: AccountId,
  type: AccountTypeCode,
  segment: SegmentCode,
  status: AccountStatus,
  owner_id: z.string(),
  name: z.string().optional(),
  balances: AccountBalances,
  currency: CurrencyCode.default('FXUSD'),
  overdraft_limit: z.number().int().nonnegative().default(0),
  daily_withdrawal_limit: z.number().int().nonnegative().default(50000),
  daily_transfer_limit: z.number().int().nonnegative().default(1000000),
  interest_rate_bps: z.number().int().nonnegative().default(0),
  monthly_fee: z.number().int().nonnegative().default(0),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  closed_at: z.string().datetime().optional(),
});
export type Account = z.infer<typeof Account>;

// =============================================================================
// TRANSACTIONS
// =============================================================================

export const TransactionType = z.enum([
  'DEPOSIT',
  'WITHDRAWAL',
  'TRANSFER',
  'PAYMENT',
  'FEE',
  'INTEREST',
  'ADJUSTMENT',
  'AUTHORIZATION',
  'CAPTURE',
  'REFUND',
  'CHARGEBACK',
  'REVERSAL',
]);
export type TransactionType = z.infer<typeof TransactionType>;

export const TransactionStatus = z.enum(['PENDING', 'POSTED', 'FAILED', 'REVERSED']);
export type TransactionStatus = z.infer<typeof TransactionStatus>;

export const Transaction = z.object({
  id: z.string().uuid(),
  type: TransactionType,
  status: TransactionStatus,
  amount: Amount,
  debit_account: AccountId,
  credit_account: AccountId,
  reference: z.string().optional(),
  memo: z.string().max(255).optional(),
  idempotency_key: z.string().optional(),
  parent_transaction_id: z.string().uuid().optional(),
  agent_id: z.string().optional(),
  session_id: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  posted_at: z.string().datetime().optional(),
  risk_score: z.number().min(0).max(1).default(0),
});
export type Transaction = z.infer<typeof Transaction>;

// =============================================================================
// AUTHORIZATION (Card Holds)
// =============================================================================

export const AuthorizationStatus = z.enum(['PENDING', 'APPROVED', 'DECLINED', 'CAPTURED', 'VOIDED', 'EXPIRED']);
export type AuthorizationStatus = z.infer<typeof AuthorizationStatus>;

export const DeclineReason = z.enum([
  'INSUFFICIENT_FUNDS',
  'CARD_EXPIRED',
  'INVALID_CARD',
  'LIMIT_EXCEEDED',
  'FRAUD_SUSPECTED',
  'VELOCITY_LIMIT',
]);
export type DeclineReason = z.infer<typeof DeclineReason>;

export const CaptureMode = z.enum(['MANUAL', 'AUTOMATIC']);
export type CaptureMode = z.infer<typeof CaptureMode>;

export const Authorization = z.object({
  id: z.string(),
  merchant_account_id: AccountId,
  card_token: z.string(),
  customer_account_id: AccountId,
  amount: Amount,
  status: AuthorizationStatus,
  decline_reason: DeclineReason.optional(),
  order_reference: z.string().optional(),
  capture_mode: CaptureMode.default('MANUAL'),
  amount_captured: z.number().int().nonnegative().default(0),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  captured_at: z.string().datetime().optional(),
  transaction_id: z.string().uuid().optional(),
});
export type Authorization = z.infer<typeof Authorization>;

// =============================================================================
// AGENTS
// =============================================================================

export const AgentType = z.enum([
  'ECOMMERCE_MERCHANT',
  'CUSTOMER_SERVICE',
  'TREASURY_MANAGEMENT',
  'ANALYTICS',
  'COMPLIANCE',
  'ADMIN',
]);
export type AgentType = z.infer<typeof AgentType>;

export const AgentStatus = z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED']);
export type AgentStatus = z.infer<typeof AgentStatus>;

export const AgentCapability = z.enum([
  'ACCOUNT_READ',
  'ACCOUNT_WRITE',
  'BALANCE_READ',
  'TRANSACTION_READ',
  'PAYMENT_INITIATE',
  'MERCHANT_PROCESSING',
  'WIRE_ORIGINATE',
  'COMPLIANCE_READ',
  'COMPLIANCE_WRITE',
]);
export type AgentCapability = z.infer<typeof AgentCapability>;

export const Agent = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  type: AgentType,
  status: AgentStatus,
  capabilities: z.array(AgentCapability),
  account_patterns: z.array(z.string()).optional(),
  transaction_types: z.array(TransactionType).optional(),
  requests_per_minute: z.number().int().positive().default(100),
  transactions_per_minute: z.number().int().positive().default(50),
  daily_amount_limit: z.number().int().positive().default(100000000),
  single_transaction_limit: z.number().int().positive().default(10000000),
  webhook_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
  last_active_at: z.string().datetime().optional(),
});
export type Agent = z.infer<typeof Agent>;

// =============================================================================
// COMPLIANCE
// =============================================================================

export const DisputeReason = z.enum([
  'UNAUTHORIZED',
  'DUPLICATE',
  'WRONG_AMOUNT',
  'NOT_RECEIVED',
  'NOT_AS_DESCRIBED',
  'FRAUD',
  'CANCELED',
]);
export type DisputeReason = z.infer<typeof DisputeReason>;

export const DisputeStatus = z.enum([
  'OPEN',
  'EVIDENCE_NEEDED',
  'UNDER_REVIEW',
  'RESOLVED_CUSTOMER',
  'RESOLVED_MERCHANT',
  'ESCALATED',
]);
export type DisputeStatus = z.infer<typeof DisputeStatus>;

export const Dispute = z.object({
  id: z.string(),
  transaction_id: z.string().uuid(),
  customer_id: z.string(),
  reason: DisputeReason,
  description: z.string().optional(),
  status: DisputeStatus,
  provisional_credit_amount: z.number().int().optional(),
  provisional_credit_transaction_id: z.string().uuid().optional(),
  resolution: z.string().optional(),
  resolved_at: z.string().datetime().optional(),
  respond_by: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Dispute = z.infer<typeof Dispute>;

export const KycVerificationType = z.enum(['IDENTITY', 'ADDRESS', 'INCOME', 'BUSINESS']);
export type KycVerificationType = z.infer<typeof KycVerificationType>;

export const KycStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'MORE_INFO_NEEDED', 'EXPIRED']);
export type KycStatus = z.infer<typeof KycStatus>;

export const KycVerification = z.object({
  id: z.string(),
  customer_id: z.string(),
  verification_type: KycVerificationType,
  status: KycStatus,
  documents: z.array(z.object({
    type: z.string(),
    reference: z.string(),
  })).optional(),
  reviewed_by: z.string().optional(),
  review_notes: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
});
export type KycVerification = z.infer<typeof KycVerification>;

// =============================================================================
// ERRORS
// =============================================================================

export const ErrorCode = z.string().regex(/^FB-[0-9]{4}$/);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const FauxBankError = z.object({
  code: ErrorCode,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  trace_id: z.string().optional(),
});
export type FauxBankError = z.infer<typeof FauxBankError>;

// Error code constants
export const ERROR_CODES = {
  // AUTH (1xxx)
  INVALID_CREDENTIALS: 'FB-1001',
  TOKEN_EXPIRED: 'FB-1002',
  INSUFFICIENT_PERMISSIONS: 'FB-1003',

  // ACCOUNT (2xxx)
  ACCOUNT_NOT_FOUND: 'FB-2001',
  ACCOUNT_FROZEN: 'FB-2002',
  ACCOUNT_CLOSED: 'FB-2003',
  INVALID_ACCOUNT_FORMAT: 'FB-2004',

  // TRANSACTION (3xxx)
  INSUFFICIENT_FUNDS: 'FB-3001',
  LIMIT_EXCEEDED: 'FB-3002',
  DUPLICATE_TRANSACTION: 'FB-3003',
  INVALID_AMOUNT: 'FB-3004',
  CURRENCY_MISMATCH: 'FB-3005',

  // COMPLIANCE (4xxx)
  KYC_REQUIRED: 'FB-4001',
  TRANSACTION_BLOCKED: 'FB-4002',
  REVIEW_REQUIRED: 'FB-4003',

  // RATE_LIMIT (5xxx)
  TOO_MANY_REQUESTS: 'FB-5001',
  VELOCITY_EXCEEDED: 'FB-5002',

  // SYSTEM (9xxx)
  INTERNAL_ERROR: 'FB-9001',
  SERVICE_UNAVAILABLE: 'FB-9002',
} as const;

// =============================================================================
// API REQUEST/RESPONSE SCHEMAS
// =============================================================================

// Create Account Request
export const CreateAccountRequest = z.object({
  type: AccountTypeCode,
  segment: SegmentCode,
  owner_id: z.string(),
  name: z.string().optional(),
  initial_deposit: Amount.optional(),
});
export type CreateAccountRequest = z.infer<typeof CreateAccountRequest>;

// Update Account Request
export const UpdateAccountRequest = z.object({
  name: z.string().optional(),
  preferences: z.record(z.unknown()).optional(),
});
export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequest>;

// Create Transaction Request
export const CreateTransactionRequest = z.object({
  type: z.enum(['TRANSFER', 'PAYMENT', 'FEE', 'ADJUSTMENT']),
  amount: Amount,
  debit_account: AccountId,
  credit_account: AccountId,
  reference: z.string().optional(),
  memo: z.string().max(255).optional(),
  idempotency_key: z.string().optional(),
});
export type CreateTransactionRequest = z.infer<typeof CreateTransactionRequest>;

// Card Authorization Request
export const CardAuthorizationRequest = z.object({
  merchant_account: AccountId,
  card_token: z.string(),
  amount: Amount,
  order_reference: z.string().optional(),
  capture_mode: CaptureMode.default('MANUAL'),
  metadata: z.record(z.unknown()).optional(),
});
export type CardAuthorizationRequest = z.infer<typeof CardAuthorizationRequest>;

// Capture Request
export const CaptureRequest = z.object({
  authorization_id: z.string(),
  amount: Amount.optional(),
});
export type CaptureRequest = z.infer<typeof CaptureRequest>;

// Refund Request
export const RefundRequest = z.object({
  original_transaction_id: z.string().uuid(),
  amount: Amount.optional(),
  reason: z.string().optional(),
});
export type RefundRequest = z.infer<typeof RefundRequest>;

// Agent Registration Request
// SECURITY FIX: Added length limits to prevent DoS attacks
export const AgentRegistrationRequest = z.object({
  agent_id: z.string()
    .min(3, 'Agent ID must be at least 3 characters')
    .max(64, 'Agent ID must be at most 64 characters')
    .regex(/^[a-z0-9-]+$/, 'Agent ID must contain only lowercase letters, numbers, and hyphens'),
  agent_type: AgentType,
  capabilities_requested: z.array(AgentCapability).max(20, 'Too many capabilities requested'),
  webhook_url: z.string().url().max(512, 'Webhook URL too long').optional(),
  rate_limits: z.object({
    requests_per_minute: z.number().int().positive().max(10000).optional(),
    transactions_per_minute: z.number().int().positive().max(1000).optional(),
    amount_per_day: z.number().int().positive().max(1000000000000).optional(), // Max F$10B
  }).optional(),
});
export type AgentRegistrationRequest = z.infer<typeof AgentRegistrationRequest>;

// Agent Scope Configuration
// SECURITY FIX: Added length limits
export const AgentScopeRequest = z.object({
  account_patterns: z.array(z.string().max(100)).max(50).optional(),
  transaction_types: z.array(TransactionType).max(20).optional(),
  amount_limits: z.object({
    single_transaction: z.number().int().positive().max(1000000000).optional(), // Max F$10M
    daily_aggregate: z.number().int().positive().max(1000000000000).optional(), // Max F$10B
  }).optional(),
});
export type AgentScopeRequest = z.infer<typeof AgentScopeRequest>;

// Freeze Account Request
export const FreezeAccountRequest = z.object({
  reason: z.enum(['FRAUD_SUSPECTED', 'COMPLIANCE_HOLD', 'CUSTOMER_REQUEST', 'DECEASED']),
});
export type FreezeAccountRequest = z.infer<typeof FreezeAccountRequest>;

// Wire Transfer Request
export const WireTransferRequest = z.object({
  from_account: AccountId,
  to_account: AccountId,
  amount: Amount,
  purpose: z.string().optional(),
  reference: z.string().optional(),
});
export type WireTransferRequest = z.infer<typeof WireTransferRequest>;

// Dispute Request
// SECURITY FIX: Added length limit on description
export const OpenDisputeRequest = z.object({
  transaction_id: z.string().uuid(),
  reason: DisputeReason,
  description: z.string().max(2000, 'Description too long').optional(),
});
export type OpenDisputeRequest = z.infer<typeof OpenDisputeRequest>;

// KYC Verification Request
// SECURITY FIX: Added length limits
export const KycVerificationRequest = z.object({
  customer_id: z.string().min(1).max(64),
  verification_type: KycVerificationType,
  documents: z.array(z.object({
    type: z.string().max(64),
    reference: z.string().max(256),
  })).max(20).optional(),
});
export type KycVerificationRequest = z.infer<typeof KycVerificationRequest>;

// Failure Injection Request
export const FailureInjectionRequest = z.object({
  network: z.enum(['FAUXVISA', 'FAUXMASTER', 'FAUXACH', 'FAUXWIRE']),
  failure_type: z.enum(['DECLINED', 'TIMEOUT', 'NETWORK_ERROR', 'DUPLICATE_DETECTED']),
  probability: z.number().min(0).max(1).default(0.1),
  duration_seconds: z.number().int().positive().default(3600),
  filter: z.object({
    merchant_category: z.string().optional(),
    amount_above: z.number().int().optional(),
    amount_below: z.number().int().optional(),
  }).optional(),
});
export type FailureInjectionRequest = z.infer<typeof FailureInjectionRequest>;

// Time Advance Request
export const TimeAdvanceRequest = z.object({
  advance_by: z.string().optional(), // ISO 8601 duration
  advance_to: z.string().datetime().optional(),
}).refine(data => data.advance_by || data.advance_to, {
  message: 'Either advance_by or advance_to must be provided',
});
export type TimeAdvanceRequest = z.infer<typeof TimeAdvanceRequest>;

// Reset Environment Request
export const ResetEnvironmentRequest = z.object({
  preserve_agents: z.boolean().default(true),
  preserve_accounts: z.array(AccountId).optional(),
  seed_scenario: z.enum(['MINIMAL', 'RETAIL_DEMO', 'COMMERCIAL_DEMO', 'FULL']).optional(),
});
export type ResetEnvironmentRequest = z.infer<typeof ResetEnvironmentRequest>;
