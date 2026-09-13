// Context assembly - what Claude sees each turn
import type { Session, ConversationTurn, Task, ArchivedTask } from '../types/session';
import type { Customer } from '../types/customer';
import type { PricingConfig } from '../types/pricing';
import type { SanitizationResult } from '../sanitization/types';

export interface AssembledContext {
  // Core identifiers
  sessionId: string;
  customerId: string;

  // Customer facts (verified, not claims)
  customer: CustomerContext;

  // Current task state
  task: TaskContext | null;

  // Recent conversation (sliding window)
  recentConversation: ConversationTurn[];

  // Archived tasks (read-only reference)
  archivedTasksSummary: ArchivedTaskSummary[];

  // Current pricing (read-only)
  pricing: PricingContext;

  // Security context
  security: SecurityContext;

  // System notifications
  notification: string | null;
}

export interface CustomerContext {
  tier: string;
  standing: string;
  totalOrders: number;
  totalSpent: number;
  refundRate: number;
  accountAgeDays: number;
  hasActiveFlags: boolean;
}

export interface TaskContext {
  type: 'generation' | 'support' | 'checkout';
  summary: string;
  state: Record<string, unknown>;
}

export interface ArchivedTaskSummary {
  id: string;
  type: string;
  archivedAt: string;
  briefSummary: string;
}

export interface PricingContext {
  tierDiscount: number;
  freeShippingThreshold: number;
  activePromotionCount: number;
  maxAllowedDiscount: number;
}

export interface SecurityContext {
  turnCount: number;
  manipulationFlagsThisSession: number;
  inputRiskScore: number;
  claimsToVerify: string[];
}

export function assembleContext(
  session: Session,
  customer: Customer,
  pricing: PricingConfig,
  sanitizationResult: SanitizationResult
): AssembledContext {
  return {
    sessionId: session.id,
    customerId: customer.id,

    customer: {
      tier: customer.tier,
      standing: customer.standing,
      totalOrders: customer.aggregateMetrics.totalOrders,
      totalSpent: customer.aggregateMetrics.totalSpent,
      refundRate: customer.aggregateMetrics.refundRate,
      accountAgeDays: customer.aggregateMetrics.accountAgeDays,
      hasActiveFlags: customer.flags.length > 0,
    },

    task: session.task ? summarizeTask(session.task) : null,

    recentConversation: session.conversationWindow,

    archivedTasksSummary: session.archivedTasks.map(summarizeArchivedTask),

    pricing: {
      tierDiscount: pricing.tierBenefits[customer.tier]?.discountPercent || 0,
      freeShippingThreshold: pricing.tierBenefits[customer.tier]?.freeShippingThreshold || 100,
      activePromotionCount: pricing.activePromotions.filter(p => p.active).length,
      maxAllowedDiscount: pricing.constraints.maxStackedDiscount,
    },

    security: {
      turnCount: session.metrics.turnCount,
      manipulationFlagsThisSession: session.metrics.manipulationFlagsTriggered,
      inputRiskScore: calculateRiskFromFlags(sanitizationResult.flags),
      claimsToVerify: sanitizationResult.claims.map(c => `${c.type}: ${c.content}`),
    },

    notification: getNotificationMessage(session.pendingNotification),
  };
}

function summarizeTask(task: Task): TaskContext | null {
  if (!task) return null;

  switch (task.type) {
    case 'generation':
      return {
        type: 'generation',
        summary: `Generating: "${task.originalPrompt.slice(0, 50)}..."`,
        state: {
          versionsCount: task.versions.length,
          currentVersionId: task.currentVersionId,
          generationCount: task.generationCount,
        },
      };

    case 'support':
      return {
        type: 'support',
        summary: `Support: ${task.topic}`,
        state: {
          status: task.status,
          referencedOrdersCount: task.referencedOrders.length,
        },
      };

    case 'checkout':
      return {
        type: 'checkout',
        summary: `Checkout: ${task.cartItems.length} items, $${task.total.toFixed(2)}`,
        state: {
          itemCount: task.cartItems.length,
          subtotal: task.subtotal,
          total: task.total,
          paymentStatus: task.paymentStatus,
        },
      };
  }
}

function summarizeArchivedTask(archived: ArchivedTask): ArchivedTaskSummary {
  let briefSummary = '';

  switch (archived.type) {
    case 'generation':
      briefSummary = `Generated ${archived.summary.versionsCount || 0} version(s)`;
      break;
    case 'support':
      briefSummary = `${archived.summary.topic}: ${archived.summary.status}`;
      break;
    case 'checkout':
      briefSummary = `${archived.summary.itemCount} items, ${archived.summary.paymentStatus}`;
      break;
  }

  return {
    id: archived.id,
    type: archived.type,
    archivedAt: archived.archivedAt,
    briefSummary,
  };
}

function calculateRiskFromFlags(flags: { [key: string]: boolean }): number {
  let score = 0;
  if (flags.injectionAttemptDetected) score += 0.4;
  if (flags.authorityClaimDetected) score += 0.2;
  if (flags.fabricatedPrecedent) score += 0.15;
  if (flags.emotionalManipulation) score += 0.1;
  if (flags.urgencyPressure) score += 0.1;
  if (flags.unicodeAnomalies) score += 0.05;
  return Math.min(score, 1.0);
}

function getNotificationMessage(notification: string | null): string | null {
  switch (notification) {
    case 'session_reset':
      return 'Session context has been refreshed. Your saved work is still accessible.';
    case 'task_archived':
      return 'Previous task has been saved.';
    case 'escalation_pending':
      return 'This request has been flagged for human review.';
    default:
      return null;
  }
}
