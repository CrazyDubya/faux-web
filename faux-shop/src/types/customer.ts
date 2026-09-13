// Customer record types - verified facts only, no promises
import type { UUID, ISODateTime, CustomerTier, AccountStanding, OrderStatus } from './index';

export interface CustomerMetrics {
  totalOrders: number;
  totalSpent: number;
  refundRate: number;
  avgOrderValue: number;
  accountAgeDays: number;
  generationsTotal: number;
  lastOrderDate?: ISODateTime;
}

export type AccountFlagType =
  | 'chargeback_history'
  | 'refund_abuse'
  | 'velocity_violation'
  | 'content_violation'
  | 'payment_issue';

export interface AccountFlag {
  type: AccountFlagType;
  setAt: ISODateTime;
  reason: string;
  expiresAt?: ISODateTime;
}

export interface OrderSummary {
  id: UUID;
  createdAt: ISODateTime;
  status: OrderStatus;
  total: number;
  itemCount: number;
  shippedAt?: ISODateTime;
  deliveredAt?: ISODateTime;
}

export type RefundReasonCode =
  | 'damaged_product'
  | 'wrong_item'
  | 'not_as_described'
  | 'never_arrived'
  | 'customer_request'
  | 'quality_issue';

export interface RefundSummary {
  id: UUID;
  orderId: UUID;
  createdAt: ISODateTime;
  amount: number;
  reasonCode: RefundReasonCode;
  approvalType: 'automatic' | 'agent_review' | 'human_review';
}

export interface Customer {
  id: UUID;
  createdAt: ISODateTime;
  email?: string;
  standing: AccountStanding;
  tier: CustomerTier;
  aggregateMetrics: CustomerMetrics;
  flags: AccountFlag[];
  orderHistory: OrderSummary[];
  refundHistory: RefundSummary[];
}
