// Core type definitions for Nano Banana Print Shop

export type UUID = string;
export type ISODateTime = string;

// Workflow types
export type WorkflowType = 'generation' | 'customer_service' | 'checkout' | 'browsing';
export type SessionStatus = 'active' | 'reset' | 'completed' | 'abandoned';
export type TaskType = 'generation' | 'support' | 'checkout';

// Confidence levels for multi-agent decisions
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.6,
  LOW: 0
} as const;

// Session constraints
export const SESSION_CONSTRAINTS = {
  TURN_LIMIT: 10,
  IDLE_LIMIT_MS: 20 * 60 * 1000, // 20 minutes
  CONVERSATION_WINDOW_SIZE: 4, // 2 exchanges (4 messages)
  MAX_PROMPT_LENGTH: 2000,
} as const;

// Customer tiers
export type CustomerTier = 'standard' | 'silver' | 'gold' | 'platinum';
export type AccountStanding = 'good' | 'watch' | 'restricted' | 'banned';

// Product types
export type ProductType = 'print_small' | 'print_medium' | 'print_large' | 'print_xlarge' | 'canvas' | 'poster';

// Order status
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

// Support topics
export type SupportTopic =
  | 'order_status'
  | 'refund_request'
  | 'generation_help'
  | 'technical_issue'
  | 'billing_question'
  | 'general_inquiry'
  | 'complaint';

// Discount sources - NEVER 'agent' or 'negotiated'
export type DiscountSource = 'promotion' | 'tier_benefit' | 'system';
export type DiscountType = 'percentage' | 'fixed' | 'shipping' | 'bogo';

// Action types for validation
export type ActionType =
  | 'generate_image'
  | 'apply_discount'
  | 'process_refund'
  | 'ship_order'
  | 'modify_account'
  | 'escalate_human'
  | 'send_message';

// Constraint types
export type ConstraintType =
  | 'margin_floor'
  | 'max_discount'
  | 'payment_required'
  | 'velocity_limit'
  | 'refund_threshold'
  | 'content_policy'
  | 'account_standing'
  | 'authority_level';

// Environment bindings
export interface Env {
  DB: D1Database;
  PRICING_CACHE: KVNamespace;
  IMAGES: R2Bucket;
  ANTHROPIC_API_KEY: string;
  ENVIRONMENT?: string;
}
