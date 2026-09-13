/**
 * Goal Manager
 *
 * Manages customer goal stacks with priorities and status tracking.
 * Goals drive customer behavior and determine success criteria.
 */

import type {
  Goal,
  GoalType,
  GoalStatus,
  TimeoutAction,
  PersonaConfig,
} from '../types/index.js';
import { createGoal } from '../types/index.js';

// ============================================================================
// Goal Manager
// ============================================================================

export class GoalManager {
  private goals: Goal[] = [];
  private readonly persona: PersonaConfig;

  constructor(persona: PersonaConfig, initialGoals?: Goal[]) {
    this.persona = persona;
    if (initialGoals) {
      this.goals = [...initialGoals].sort((a, b) => b.priority - a.priority);
    }
  }

  // ==========================================================================
  // Goal Stack Operations
  // ==========================================================================

  addGoal(goal: Goal): void {
    this.goals.push(goal);
    this.goals.sort((a, b) => b.priority - a.priority);
  }

  addGoalFromType(
    type: GoalType,
    priority: number,
    context?: Record<string, unknown>
  ): Goal {
    const goal = createGoal(type, priority, context);
    this.addGoal(goal);
    return goal;
  }

  removeGoal(goalId: string): boolean {
    const index = this.goals.findIndex((g) => g.id === goalId);
    if (index >= 0) {
      this.goals.splice(index, 1);
      return true;
    }
    return false;
  }

  getGoals(): Goal[] {
    return [...this.goals];
  }

  getPrimaryGoal(): Goal | undefined {
    return this.goals.find(
      (g) => g.status === 'PENDING' || g.status === 'IN_PROGRESS'
    );
  }

  getActiveGoals(): Goal[] {
    return this.goals.filter(
      (g) => g.status === 'PENDING' || g.status === 'IN_PROGRESS'
    );
  }

  getGoalById(id: string): Goal | undefined {
    return this.goals.find((g) => g.id === id);
  }

  // ==========================================================================
  // Goal Status Updates
  // ==========================================================================

  startGoal(goalId: string): void {
    const goal = this.getGoalById(goalId);
    if (goal && goal.status === 'PENDING') {
      goal.status = 'IN_PROGRESS';
    }
  }

  completeGoal(goalId: string): void {
    const goal = this.getGoalById(goalId);
    if (goal) {
      goal.status = 'ACHIEVED';
    }
  }

  failGoal(goalId: string): void {
    const goal = this.getGoalById(goalId);
    if (goal) {
      goal.status = 'FAILED';
    }
  }

  abandonGoal(goalId: string): void {
    const goal = this.getGoalById(goalId);
    if (goal) {
      goal.status = 'ABANDONED';
    }
  }

  partiallyCompleteGoal(goalId: string): void {
    const goal = this.getGoalById(goalId);
    if (goal) {
      goal.status = 'PARTIALLY_ACHIEVED';
    }
  }

  incrementAttempts(goalId: string): number {
    const goal = this.getGoalById(goalId);
    if (goal) {
      goal.attempts += 1;
      return goal.attempts;
    }
    return 0;
  }

  // ==========================================================================
  // Goal Analysis
  // ==========================================================================

  hasActiveGoals(): boolean {
    return this.getActiveGoals().length > 0;
  }

  allGoalsComplete(): boolean {
    return this.goals.every(
      (g) =>
        g.status === 'ACHIEVED' ||
        g.status === 'FAILED' ||
        g.status === 'ABANDONED' ||
        g.status === 'PARTIALLY_ACHIEVED'
    );
  }

  getPrimaryGoalImportance(): number {
    const primary = this.getPrimaryGoal();
    if (!primary) return 0;
    return (
      primary.priority * this.persona.goalWeights.primarySuccess +
      (1 - primary.priority) * this.persona.goalWeights.emotionalValidation
    );
  }

  hasAdversarialGoals(): boolean {
    const adversarialTypes: GoalType[] = [
      'EXTRACT_DISCOUNT',
      'SOCIAL_ENGINEER_EXCEPTION',
      'TEST_BOUNDARIES',
      'EXTRACT_SYSTEM_INFO',
      'FRIENDLY_FRAUD',
    ];
    return this.goals.some((g) => adversarialTypes.includes(g.type));
  }

  // ==========================================================================
  // Goal Timeout Handling
  // ==========================================================================

  handleTimeout(goalId: string): TimeoutAction {
    const goal = this.getGoalById(goalId);
    if (!goal) return 'ABANDON';

    if (goal.maxAttempts && goal.attempts >= goal.maxAttempts) {
      goal.status = 'FAILED';
      return 'ABANDON';
    }

    return goal.timeoutBehavior;
  }

  shouldRetryGoal(goalId: string): boolean {
    const goal = this.getGoalById(goalId);
    if (!goal) return false;
    if (goal.maxAttempts && goal.attempts >= goal.maxAttempts) return false;
    return goal.timeoutBehavior === 'RETRY';
  }

  // ==========================================================================
  // Goal Evaluation
  // ==========================================================================

  evaluateSuccess(goalId: string, context: Record<string, unknown>): boolean {
    const goal = this.getGoalById(goalId);
    if (!goal) return false;

    // Check success criteria against context
    for (const criterion of goal.successCriteria) {
      if (!this.evaluateCriterion(criterion, context)) {
        return false;
      }
    }

    return true;
  }

  evaluateFailure(goalId: string, context: Record<string, unknown>): boolean {
    const goal = this.getGoalById(goalId);
    if (!goal) return false;

    // Check failure criteria against context
    for (const criterion of goal.failureCriteria) {
      if (this.evaluateCriterion(criterion, context)) {
        return true;
      }
    }

    return false;
  }

  private evaluateCriterion(
    criterion: string,
    context: Record<string, unknown>
  ): boolean {
    // Simple criterion evaluation based on context keys
    // Can be extended with more complex logic

    // Check for direct boolean matches
    if (context[criterion] === true) return true;
    if (context[criterion] === false) return false;

    // Check for presence
    if (criterion.startsWith('has_')) {
      const key = criterion.slice(4);
      return context[key] !== undefined && context[key] !== null;
    }

    // Check for absence
    if (criterion.startsWith('no_')) {
      const key = criterion.slice(3);
      return context[key] === undefined || context[key] === null;
    }

    return false;
  }

  // ==========================================================================
  // Summary
  // ==========================================================================

  getSummary(): GoalSummary {
    return {
      total: this.goals.length,
      pending: this.goals.filter((g) => g.status === 'PENDING').length,
      inProgress: this.goals.filter((g) => g.status === 'IN_PROGRESS').length,
      achieved: this.goals.filter((g) => g.status === 'ACHIEVED').length,
      failed: this.goals.filter((g) => g.status === 'FAILED').length,
      abandoned: this.goals.filter((g) => g.status === 'ABANDONED').length,
      partiallyAchieved: this.goals.filter(
        (g) => g.status === 'PARTIALLY_ACHIEVED'
      ).length,
      hasAdversarial: this.hasAdversarialGoals(),
    };
  }
}

export interface GoalSummary {
  total: number;
  pending: number;
  inProgress: number;
  achieved: number;
  failed: number;
  abandoned: number;
  partiallyAchieved: number;
  hasAdversarial: boolean;
}

// ============================================================================
// Goal Templates
// ============================================================================

export const GOAL_TEMPLATES: Record<GoalType, Partial<Goal>> = {
  PURCHASE_PRODUCT: {
    successCriteria: ['order_placed', 'payment_confirmed'],
    failureCriteria: ['payment_declined', 'product_unavailable'],
    timeoutBehavior: 'ABANDON',
    maxAttempts: 3,
  },
  RETURN_PRODUCT: {
    successCriteria: ['return_approved', 'refund_issued'],
    failureCriteria: ['return_denied', 'outside_window'],
    timeoutBehavior: 'ESCALATE',
    maxAttempts: 2,
  },
  EXCHANGE_PRODUCT: {
    successCriteria: ['exchange_approved', 'new_item_shipped'],
    failureCriteria: ['exchange_denied', 'item_unavailable'],
    timeoutBehavior: 'SWITCH_TACTIC',
    maxAttempts: 2,
  },
  GET_REFUND: {
    successCriteria: ['refund_issued'],
    failureCriteria: ['refund_denied'],
    timeoutBehavior: 'ESCALATE',
    maxAttempts: 3,
  },
  GET_PRODUCT_INFO: {
    successCriteria: ['info_received'],
    failureCriteria: [],
    timeoutBehavior: 'RETRY',
    maxAttempts: 2,
  },
  CHECK_ORDER_STATUS: {
    successCriteria: ['status_received'],
    failureCriteria: ['order_not_found'],
    timeoutBehavior: 'RETRY',
    maxAttempts: 2,
  },
  UNDERSTAND_POLICY: {
    successCriteria: ['policy_explained'],
    failureCriteria: [],
    timeoutBehavior: 'RETRY',
    maxAttempts: 3,
  },
  CREATE_ACCOUNT: {
    successCriteria: ['account_created'],
    failureCriteria: ['creation_failed'],
    timeoutBehavior: 'ABANDON',
    maxAttempts: 2,
  },
  UPDATE_ACCOUNT: {
    successCriteria: ['account_updated'],
    failureCriteria: ['update_failed'],
    timeoutBehavior: 'RETRY',
    maxAttempts: 2,
  },
  CLOSE_ACCOUNT: {
    successCriteria: ['account_closed'],
    failureCriteria: ['closure_denied'],
    timeoutBehavior: 'ESCALATE',
    maxAttempts: 2,
  },
  DISPUTE_CHARGE: {
    successCriteria: ['dispute_resolved', 'charge_reversed'],
    failureCriteria: ['dispute_denied'],
    timeoutBehavior: 'ESCALATE',
    maxAttempts: 3,
  },
  EXTRACT_DISCOUNT: {
    successCriteria: ['discount_granted', 'price_reduced'],
    failureCriteria: ['discount_denied', 'no_discount_available'],
    timeoutBehavior: 'SWITCH_TACTIC',
    maxAttempts: 4,
  },
  SOCIAL_ENGINEER_EXCEPTION: {
    successCriteria: ['exception_granted'],
    failureCriteria: ['exception_denied', 'escalation_blocked'],
    timeoutBehavior: 'SWITCH_TACTIC',
    maxAttempts: 3,
  },
  TEST_BOUNDARIES: {
    successCriteria: ['boundary_found', 'limit_exceeded'],
    failureCriteria: ['blocked'],
    timeoutBehavior: 'SWITCH_TACTIC',
    maxAttempts: 5,
  },
  EXTRACT_SYSTEM_INFO: {
    successCriteria: ['info_extracted'],
    failureCriteria: ['no_info_provided'],
    timeoutBehavior: 'SWITCH_TACTIC',
    maxAttempts: 4,
  },
  FRIENDLY_FRAUD: {
    successCriteria: ['refund_without_return', 'chargeback_won'],
    failureCriteria: ['fraud_detected', 'claim_denied'],
    timeoutBehavior: 'ABANDON',
    maxAttempts: 2,
  },
  ESCALATE_TO_HUMAN: {
    successCriteria: ['human_connected'],
    failureCriteria: ['escalation_blocked'],
    timeoutBehavior: 'RETRY',
    maxAttempts: 3,
  },
  DOCUMENT_FOR_COMPLAINT: {
    successCriteria: ['documentation_gathered'],
    failureCriteria: [],
    timeoutBehavior: 'ABANDON',
    maxAttempts: 5,
  },
  ABANDON_AND_COMPLAIN: {
    successCriteria: ['complaint_registered'],
    failureCriteria: [],
    timeoutBehavior: 'ABANDON',
    maxAttempts: 1,
  },
};

export function createGoalFromTemplate(
  type: GoalType,
  priority: number,
  context?: Record<string, unknown>
): Goal {
  const template = GOAL_TEMPLATES[type] ?? {};
  const base = createGoal(type, priority, context);

  return {
    ...base,
    successCriteria: template.successCriteria ?? [],
    failureCriteria: template.failureCriteria ?? [],
    timeoutBehavior: template.timeoutBehavior ?? 'ESCALATE',
    maxAttempts: template.maxAttempts ?? 3,
  };
}
