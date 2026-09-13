// Conversation router - orchestrates the full request flow
import type { Env, WorkflowType } from '../types';
import type { Session, ConversationTurn } from '../types/session';
import type { Customer } from '../types/customer';
import { Sanitizer } from '../sanitization/sanitizer';
import type { SanitizationResult } from '../sanitization/types';
import { SessionManager } from '../session/manager';
import { assembleContext, type AssembledContext } from '../session/context-assembly';
import { PricingService } from '../pricing/service';
import { CustomerServiceAgent } from '../agents/customer-service/agent';
import { GenerationAgent } from '../agents/generation/agent';
import { CheckoutAgent } from '../agents/checkout/agent';
import type { AgentResponse } from '../agents/base-agent';
import { Logger } from '../observability/logger';

export interface ConversationRequest {
  sessionId?: string;
  customerId: string;
  message: string;
  workflow?: WorkflowType;
}

export interface ConversationResponse {
  sessionId: string;
  message: string;
  workflow: WorkflowType;
  taskState?: Record<string, unknown>;
  warnings: string[];
  metadata: {
    requestId: string;
    turnCount: number;
    didReset: boolean;
    wasEscalated: boolean;
  };
}

export class ConversationRouter {
  private env: Env;
  private sanitizer: Sanitizer;
  private sessionManager: SessionManager;
  private pricingService: PricingService;
  private logger: Logger;

  // Agent instances
  private customerServiceAgent: CustomerServiceAgent;
  private generationAgent: GenerationAgent;
  private checkoutAgent: CheckoutAgent;

  constructor(env: Env, logger: Logger) {
    this.env = env;
    this.logger = logger;
    this.sanitizer = new Sanitizer();
    this.sessionManager = new SessionManager(env);
    this.pricingService = new PricingService(env);

    this.customerServiceAgent = new CustomerServiceAgent(env, logger);
    this.generationAgent = new GenerationAgent(env, logger);
    this.checkoutAgent = new CheckoutAgent(env, logger);
  }

  async process(request: ConversationRequest): Promise<ConversationResponse> {
    const startTime = Date.now();
    const warnings: string[] = [];

    // Step 1: Get or create session
    const session = await this.sessionManager.getOrCreateSession(
      request.sessionId,
      request.customerId
    );

    this.logger.setContext({
      sessionId: session.id,
      customerId: request.customerId,
      db: this.env.DB,
    });

    this.logger.info('Processing conversation turn', {
      turnCount: session.metrics.turnCount,
      hasTask: !!session.task,
    });

    // Step 2: Determine workflow
    const workflow = request.workflow || this.detectWorkflow(request.message, session);

    // Step 3: Sanitize input
    const sanitizationResult = await this.sanitizer.process(request.message, workflow);

    if (!sanitizationResult.success) {
      this.logger.security('input_rejected', {
        reason: sanitizationResult.rejectionReason,
        flags: sanitizationResult.flags,
      });

      return {
        sessionId: session.id,
        message: this.getInputRejectionMessage(sanitizationResult),
        workflow,
        warnings: [sanitizationResult.rejectionReason || 'Input rejected'],
        metadata: {
          requestId: this.logger.getRequestId(),
          turnCount: session.metrics.turnCount,
          didReset: false,
          wasEscalated: false,
        },
      };
    }

    // Log manipulation if detected
    if (sanitizationResult.flags.manipulationPatternsDetected) {
      this.logger.manipulationDetected(
        Object.entries(sanitizationResult.flags)
          .filter(([_, v]) => v)
          .map(([k]) => k),
        this.sanitizer.getRiskScore(sanitizationResult.flags)
      );

      // Update session manipulation count
      await this.sessionManager.processSessionEvent(session, {
        type: 'MANIPULATION_DETECTED',
      });
    }

    // Step 4: Load customer data
    const customer = await this.loadCustomer(request.customerId);

    // Step 5: Get pricing config
    const pricingConfig = await this.pricingService.getPricingConfig();

    // Step 6: Assemble context
    const context = assembleContext(session, customer, pricingConfig, sanitizationResult);

    // Step 7: Process message event
    const { session: updatedSession, didReset, notification } = await this.sessionManager.processSessionEvent(
      session,
      { type: 'MESSAGE_RECEIVED' }
    );

    if (didReset) {
      warnings.push('Session context has been refreshed for optimal assistance.');
    }

    // Step 8: Route to appropriate agent
    const agentResponse = await this.routeToAgent(workflow, context, sanitizationResult.sanitizedContent);

    // Step 9: Handle escalation if needed
    if (agentResponse.needsEscalation) {
      this.logger.escalation(agentResponse.escalationReason || 'Unknown reason', {
        agentId: workflow,
        confidence: agentResponse.confidence,
      });
      warnings.push('This request has been flagged for review.');
    }

    // Step 10: Add to conversation window
    const userTurn: ConversationTurn = {
      role: 'user',
      content: sanitizationResult.sanitizedContent,
      timestamp: new Date().toISOString(),
    };

    const assistantTurn: ConversationTurn = {
      role: 'assistant',
      content: agentResponse.message,
      timestamp: new Date().toISOString(),
    };

    let finalSession = await this.sessionManager.addToConversationWindow(updatedSession, userTurn);
    finalSession = await this.sessionManager.addToConversationWindow(finalSession, assistantTurn);

    // Clear notification if shown
    if (notification) {
      finalSession = await this.sessionManager.clearNotification(finalSession);
    }

    // Log completion
    const durationMs = Date.now() - startTime;
    this.logger.info('Conversation turn complete', {
      workflow,
      durationMs,
      wasEscalated: agentResponse.needsEscalation,
      actionsProposed: agentResponse.proposedActions.length,
    });

    return {
      sessionId: finalSession.id,
      message: agentResponse.message,
      workflow,
      taskState: context.task?.state,
      warnings,
      metadata: {
        requestId: this.logger.getRequestId(),
        turnCount: finalSession.metrics.turnCount,
        didReset,
        wasEscalated: agentResponse.needsEscalation,
      },
    };
  }

  private detectWorkflow(message: string, session: Session): WorkflowType {
    // If there's an existing task, continue with that workflow
    if (session.task) {
      return session.task.type === 'generation'
        ? 'generation'
        : session.task.type === 'checkout'
        ? 'checkout'
        : 'customer_service';
    }

    const lowerMessage = message.toLowerCase();

    // Generation keywords
    if (
      /\b(generate|create|make|design|draw|paint|image|picture|art)\b/i.test(lowerMessage) &&
      !lowerMessage.includes('order') &&
      !lowerMessage.includes('refund')
    ) {
      return 'generation';
    }

    // Checkout keywords
    if (/\b(checkout|cart|buy|purchase|order|pay|shipping)\b/i.test(lowerMessage)) {
      return 'checkout';
    }

    // Support keywords
    if (
      /\b(help|support|refund|problem|issue|question|cancel|status)\b/i.test(lowerMessage)
    ) {
      return 'customer_service';
    }

    // Default to browsing/general
    return 'browsing';
  }

  private async routeToAgent(
    workflow: WorkflowType,
    context: AssembledContext,
    message: string
  ): Promise<AgentResponse> {
    switch (workflow) {
      case 'generation':
        return this.generationAgent.process(context, message);

      case 'checkout':
        return this.checkoutAgent.process(context, message);

      case 'customer_service':
        return this.customerServiceAgent.process(context, message);

      case 'browsing':
      default:
        // For browsing, use customer service agent with general help
        return this.customerServiceAgent.process(context, message);
    }
  }

  private async loadCustomer(customerId: string): Promise<Customer> {
    // Load from database or create new
    try {
      const result = await this.env.DB
        .prepare('SELECT * FROM customers WHERE id = ?')
        .bind(customerId)
        .first<{
          id: string;
          email: string;
          created_at: string;
          standing: string;
          tier: string;
          total_orders: number;
          total_spent: number;
        }>();

      if (result) {
        return {
          id: result.id,
          createdAt: result.created_at,
          email: result.email,
          standing: result.standing as Customer['standing'],
          tier: result.tier as Customer['tier'],
          aggregateMetrics: {
            totalOrders: result.total_orders,
            totalSpent: result.total_spent,
            refundRate: 0,
            avgOrderValue: result.total_orders > 0 ? result.total_spent / result.total_orders : 0,
            accountAgeDays: Math.floor(
              (Date.now() - new Date(result.created_at).getTime()) / (1000 * 60 * 60 * 24)
            ),
            generationsTotal: 0,
          },
          flags: [],
          orderHistory: [],
          refundHistory: [],
        };
      }
    } catch (error) {
      this.logger.error('Failed to load customer', { customerId, error: String(error) });
    }

    // Return new customer
    return {
      id: customerId,
      createdAt: new Date().toISOString(),
      standing: 'good',
      tier: 'standard',
      aggregateMetrics: {
        totalOrders: 0,
        totalSpent: 0,
        refundRate: 0,
        avgOrderValue: 0,
        accountAgeDays: 0,
        generationsTotal: 0,
      },
      flags: [],
      orderHistory: [],
      refundHistory: [],
    };
  }

  private getInputRejectionMessage(result: SanitizationResult): string {
    if (result.flags.contentPolicyRisk) {
      return "I'm not able to help with that request as it may violate our content guidelines. Please try a different request.";
    }

    if (result.flags.injectionAttemptDetected) {
      return "I noticed something unusual in your message. Could you please rephrase your request?";
    }

    return "I couldn't process that message. Please try rephrasing your request.";
  }
}
