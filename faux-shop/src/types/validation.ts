// Action validation types
import type { UUID, ISODateTime, ActionType, ConstraintType } from './index';

export interface ProposedAction {
  type: ActionType;
  agentId: string;
  sessionId?: UUID;
  customerId?: UUID;
  timestamp: ISODateTime;
  parameters: Record<string, unknown>;
  reasoning?: string;
  confidence?: number;
}

export interface ConstraintCheck {
  constraint: ConstraintType;
  passed: boolean;
  details?: Record<string, unknown>;
}

export interface ConstraintViolation {
  constraint: ConstraintType;
  severity: 'hard' | 'soft';
  message: string;
  proposedValue?: unknown;
  allowedValue?: unknown;
}

export interface ValidationResult {
  allowed: boolean;
  checkedConstraints: ConstraintCheck[];
  violations: ConstraintViolation[];
  modifiedAction?: Record<string, unknown>;
}

// Hard constraints that cannot be overridden
export const HARD_CONSTRAINTS = {
  MARGIN_FLOOR: 0.15,
  MAX_DISCOUNT_PERCENT: 50,
  MAX_STACKED_DISCOUNT: 60,
  REFUND_AUTO_LIMIT: 100,
  MAX_GENERATIONS_PER_SESSION: 20,
} as const;
