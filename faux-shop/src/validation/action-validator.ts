// Action validator - enforces hard constraints that cannot be overridden
import type { ActionType, ConstraintType } from '../types';
import type {
  ProposedAction,
  ValidationResult,
  ConstraintCheck,
  ConstraintViolation,
} from '../types/validation';
import { HARD_CONSTRAINTS } from '../types/validation';
import type { Customer } from '../types/customer';
import type { PricingConfig } from '../types/pricing';
import type { Session } from '../types/session';

interface ValidationContext {
  customer: Customer;
  session: Session;
  pricing: PricingConfig;
}

export class ActionValidator {
  validate(action: ProposedAction, context: ValidationContext): ValidationResult {
    const checks: ConstraintCheck[] = [];
    const violations: ConstraintViolation[] = [];
    let modifiedAction: Record<string, unknown> | undefined;

    // Always check account standing first
    this.checkAccountStanding(action, context.customer, checks, violations);

    // Action-specific validation
    switch (action.type) {
      case 'apply_discount':
        modifiedAction = this.validateDiscount(action, context, checks, violations);
        break;

      case 'process_refund':
        this.validateRefund(action, context, checks, violations);
        break;

      case 'ship_order':
        this.validateShipment(action, context, checks, violations);
        break;

      case 'generate_image':
        this.validateGeneration(action, context, checks, violations);
        break;

      case 'modify_account':
        this.validateAccountModification(action, context, checks, violations);
        break;

      case 'escalate_human':
        // Always allowed
        checks.push({ constraint: 'authority_level', passed: true });
        break;

      case 'send_message':
        // Always allowed (content filtered separately)
        checks.push({ constraint: 'content_policy', passed: true });
        break;
    }

    const hasHardViolation = violations.some(v => v.severity === 'hard');

    return {
      allowed: !hasHardViolation,
      checkedConstraints: checks,
      violations,
      modifiedAction,
    };
  }

  private checkAccountStanding(
    action: ProposedAction,
    customer: Customer,
    checks: ConstraintCheck[],
    violations: ConstraintViolation[]
  ): void {
    const standing = customer.standing;

    // Banned accounts can only escalate
    if (standing === 'banned' && action.type !== 'escalate_human') {
      violations.push({
        constraint: 'account_standing',
        severity: 'hard',
        message: 'Account is banned. Only escalation to human review is allowed.',
        proposedValue: action.type,
        allowedValue: 'escalate_human',
      });
      checks.push({ constraint: 'account_standing', passed: false });
      return;
    }

    // Restricted accounts have limited actions
    if (standing === 'restricted') {
      const restrictedActions: ActionType[] = ['apply_discount', 'process_refund'];
      if (restrictedActions.includes(action.type)) {
        violations.push({
          constraint: 'account_standing',
          severity: 'soft',
          message: 'Account is restricted. Action flagged for review.',
          proposedValue: action.type,
        });
      }
    }

    checks.push({
      constraint: 'account_standing',
      passed: standing !== 'banned',
      details: { standing },
    });
  }

  private validateDiscount(
    action: ProposedAction,
    context: ValidationContext,
    checks: ConstraintCheck[],
    violations: ConstraintViolation[]
  ): Record<string, unknown> | undefined {
    const params = action.parameters as {
      discountPercent?: number;
      discountAmount?: number;
      orderTotal?: number;
    };

    let modifiedParams: Record<string, unknown> | undefined;

    // Check discount source - customer agents CANNOT create discounts
    if (action.agentId.startsWith('customer_')) {
      violations.push({
        constraint: 'authority_level',
        severity: 'hard',
        message: 'Customer-facing agents cannot create or modify discounts',
        proposedValue: 'create_discount',
        allowedValue: 'apply_existing_discount',
      });
      checks.push({ constraint: 'authority_level', passed: false });
      return undefined;
    }

    // Check max discount percentage
    const discountPercent = params.discountPercent || 0;
    if (discountPercent > HARD_CONSTRAINTS.MAX_DISCOUNT_PERCENT) {
      violations.push({
        constraint: 'max_discount',
        severity: 'hard',
        message: `Discount ${discountPercent}% exceeds maximum ${HARD_CONSTRAINTS.MAX_DISCOUNT_PERCENT}%`,
        proposedValue: discountPercent,
        allowedValue: HARD_CONSTRAINTS.MAX_DISCOUNT_PERCENT,
      });
      checks.push({ constraint: 'max_discount', passed: false });

      // Cap the discount instead of rejecting entirely
      modifiedParams = {
        ...params,
        discountPercent: HARD_CONSTRAINTS.MAX_DISCOUNT_PERCENT,
        cappedFrom: discountPercent,
      };
    } else {
      checks.push({ constraint: 'max_discount', passed: true });
    }

    // Check margin floor
    if (params.orderTotal && params.discountAmount) {
      const effectiveMargin = (params.orderTotal - params.discountAmount) / params.orderTotal;
      if (effectiveMargin < HARD_CONSTRAINTS.MARGIN_FLOOR) {
        violations.push({
          constraint: 'margin_floor',
          severity: 'hard',
          message: `Effective margin ${(effectiveMargin * 100).toFixed(1)}% below floor ${HARD_CONSTRAINTS.MARGIN_FLOOR * 100}%`,
          proposedValue: effectiveMargin,
          allowedValue: HARD_CONSTRAINTS.MARGIN_FLOOR,
        });
        checks.push({ constraint: 'margin_floor', passed: false });
      } else {
        checks.push({ constraint: 'margin_floor', passed: true });
      }
    }

    return modifiedParams;
  }

  private validateRefund(
    action: ProposedAction,
    context: ValidationContext,
    checks: ConstraintCheck[],
    violations: ConstraintViolation[]
  ): void {
    const params = action.parameters as {
      amount?: number;
      orderId?: string;
    };

    // Check refund amount threshold
    const amount = params.amount || 0;
    if (amount > HARD_CONSTRAINTS.REFUND_AUTO_LIMIT) {
      violations.push({
        constraint: 'refund_threshold',
        severity: 'soft', // Soft = requires escalation, not blocked
        message: `Refund amount $${amount} exceeds auto-approval limit $${HARD_CONSTRAINTS.REFUND_AUTO_LIMIT}`,
        proposedValue: amount,
        allowedValue: HARD_CONSTRAINTS.REFUND_AUTO_LIMIT,
      });
      checks.push({ constraint: 'refund_threshold', passed: false });
    } else {
      checks.push({ constraint: 'refund_threshold', passed: true });
    }

    // Check customer refund rate
    if (context.customer.aggregateMetrics.refundRate > 0.3) {
      violations.push({
        constraint: 'velocity_limit',
        severity: 'soft',
        message: `Customer refund rate ${(context.customer.aggregateMetrics.refundRate * 100).toFixed(1)}% is elevated`,
      });
      checks.push({
        constraint: 'velocity_limit',
        passed: false,
        details: { refundRate: context.customer.aggregateMetrics.refundRate },
      });
    } else {
      checks.push({ constraint: 'velocity_limit', passed: true });
    }
  }

  private validateShipment(
    action: ProposedAction,
    context: ValidationContext,
    checks: ConstraintCheck[],
    violations: ConstraintViolation[]
  ): void {
    const params = action.parameters as {
      orderId?: string;
      paymentStatus?: string;
    };

    // HARD CONSTRAINT: Cannot ship without completed payment
    if (params.paymentStatus !== 'completed') {
      violations.push({
        constraint: 'payment_required',
        severity: 'hard',
        message: 'Cannot ship order without completed payment',
        proposedValue: params.paymentStatus,
        allowedValue: 'completed',
      });
      checks.push({ constraint: 'payment_required', passed: false });
    } else {
      checks.push({ constraint: 'payment_required', passed: true });
    }
  }

  private validateGeneration(
    action: ProposedAction,
    context: ValidationContext,
    checks: ConstraintCheck[],
    violations: ConstraintViolation[]
  ): void {
    // Check generation velocity
    const task = context.session.task;
    if (task?.type === 'generation') {
      if (task.generationCount >= HARD_CONSTRAINTS.MAX_GENERATIONS_PER_SESSION) {
        violations.push({
          constraint: 'velocity_limit',
          severity: 'hard',
          message: `Generation limit ${HARD_CONSTRAINTS.MAX_GENERATIONS_PER_SESSION} reached for this session`,
          proposedValue: task.generationCount + 1,
          allowedValue: HARD_CONSTRAINTS.MAX_GENERATIONS_PER_SESSION,
        });
        checks.push({ constraint: 'velocity_limit', passed: false });
        return;
      }
    }

    checks.push({ constraint: 'velocity_limit', passed: true });
    checks.push({ constraint: 'content_policy', passed: true }); // Content checked in sanitization
  }

  private validateAccountModification(
    action: ProposedAction,
    context: ValidationContext,
    checks: ConstraintCheck[],
    violations: ConstraintViolation[]
  ): void {
    // Customer agents cannot modify account tiers or standing
    if (action.agentId.startsWith('customer_')) {
      const params = action.parameters as { field?: string };
      const protectedFields = ['tier', 'standing', 'flags'];

      if (params.field && protectedFields.includes(params.field)) {
        violations.push({
          constraint: 'authority_level',
          severity: 'hard',
          message: `Customer-facing agents cannot modify ${params.field}`,
          proposedValue: params.field,
          allowedValue: 'read-only',
        });
        checks.push({ constraint: 'authority_level', passed: false });
        return;
      }
    }

    checks.push({ constraint: 'authority_level', passed: true });
  }
}

// Export singleton
export const actionValidator = new ActionValidator();
