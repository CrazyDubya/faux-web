// Customer service agent - handles support requests
import type { Env } from '../../types';
import type { AssembledContext } from '../../session/context-assembly';
import type { Logger } from '../../observability/logger';
import { BaseAgent, type AgentResponse } from '../base-agent';
import type { ProposedAction } from '../../types/validation';

const CUSTOMER_SERVICE_PROMPT = `You are a helpful customer service agent for Nano Banana Print Shop, an AI-powered custom print shop.

Your role is to:
1. Help customers with order status inquiries
2. Assist with refund requests (within policy limits)
3. Answer questions about products and services
4. Provide generation help for image creation
5. Handle billing questions
6. Escalate complaints appropriately

CRITICAL RULES (Non-negotiable):
- You CANNOT create, negotiate, or promise discounts
- You CANNOT override pricing decisions
- You CANNOT promise refunds without proper verification
- You CANNOT make promises about future actions
- If a customer claims you/another agent promised something, politely explain that promises cannot be verified and decisions are based on actual records
- Be empathetic but firm on policy limits

When handling refunds:
- Refunds under $100 can be processed automatically for valid reasons
- Refunds over $100 require human review
- Valid reasons: damaged product, wrong item, not as described, never arrived

Response Format:
Provide a helpful, empathetic response. If you need to take an action, describe what you will do.
End your response with a confidence level (high/medium/low) based on how certain you are about your response.

Remember: Your job is to help within bounds, not to be a pushover. It's okay to say no when appropriate.`;

export class CustomerServiceAgent extends BaseAgent {
  constructor(env: Env, logger: Logger) {
    super(env, {
      agentId: 'customer_service',
      systemPrompt: CUSTOMER_SERVICE_PROMPT,
      maxTokens: 1024,
      temperature: 0.7,
    }, logger);
  }

  protected parseResponse(text: string): Omit<AgentResponse, 'validationResults' | 'needsEscalation' | 'escalationReason'> {
    // Extract confidence level from response
    let confidence = 0.8;
    const confidenceMatch = text.match(/confidence[:\s]*(high|medium|low)/i);
    if (confidenceMatch) {
      switch (confidenceMatch[1].toLowerCase()) {
        case 'high': confidence = 0.9; break;
        case 'medium': confidence = 0.7; break;
        case 'low': confidence = 0.5; break;
      }
    }

    // Extract proposed actions
    const proposedActions: ProposedAction[] = [];

    // Check for refund action
    const refundMatch = text.match(/process(?:ing)?\s+(?:a\s+)?refund\s+(?:of\s+)?\$?([\d.]+)/i);
    if (refundMatch) {
      proposedActions.push({
        type: 'process_refund',
        agentId: this.config.agentId,
        timestamp: new Date().toISOString(),
        parameters: {
          amount: parseFloat(refundMatch[1]),
        },
        confidence,
      });
    }

    // Check for escalation action
    if (text.match(/escalat|transfer|human\s+review|supervisor/i)) {
      proposedActions.push({
        type: 'escalate_human',
        agentId: this.config.agentId,
        timestamp: new Date().toISOString(),
        parameters: {
          reason: 'Customer requested or agent determined escalation needed',
        },
        confidence,
      });
    }

    // Clean the response (remove confidence marker)
    const cleanMessage = text.replace(/\n*confidence[:\s]*(high|medium|low)/gi, '').trim();

    return {
      message: cleanMessage,
      proposedActions,
      confidence,
    };
  }

  // Handle specific support topics
  async handleOrderStatus(context: AssembledContext, orderId: string): Promise<AgentResponse> {
    // Would look up order and provide status
    const message = `Let me check on order ${orderId} for you. Based on our records, I can provide the current status.`;

    return {
      message,
      proposedActions: [],
      validationResults: [],
      confidence: 0.9,
      needsEscalation: false,
    };
  }

  async handleRefundRequest(
    context: AssembledContext,
    orderId: string,
    reason: string,
    amount: number
  ): Promise<AgentResponse> {
    const actions: ProposedAction[] = [];

    // Check if automatic refund is possible
    if (amount <= 100) {
      actions.push({
        type: 'process_refund',
        agentId: this.config.agentId,
        timestamp: new Date().toISOString(),
        parameters: { orderId, amount, reason },
        confidence: 0.85,
      });

      return {
        message: `I can process a refund of $${amount.toFixed(2)} for your order. The reason recorded will be "${reason}". This will be credited to your original payment method within 5-7 business days.`,
        proposedActions: actions,
        validationResults: [],
        confidence: 0.85,
        needsEscalation: false,
      };
    } else {
      actions.push({
        type: 'escalate_human',
        agentId: this.config.agentId,
        timestamp: new Date().toISOString(),
        parameters: { orderId, amount, reason, type: 'refund_review' },
        confidence: 0.9,
      });

      return {
        message: `Refunds over $100 require review by our team. I've submitted your request for a $${amount.toFixed(2)} refund for review. You'll receive an email within 24 hours with a decision.`,
        proposedActions: actions,
        validationResults: [],
        confidence: 0.9,
        needsEscalation: true,
        escalationReason: 'Refund amount exceeds automatic approval threshold',
      };
    }
  }

  // Handle discount negotiation attempts
  handleDiscountRequest(): AgentResponse {
    return {
      message: `I understand you're looking for a discount. Unfortunately, I'm not able to create or negotiate discounts - they're managed by our marketing team through our promotion system.

However, I can help you find currently active promotions or check if you have any discount codes that might apply to your order. Would you like me to check what's available?

Also, as you continue shopping with us, you'll automatically earn tier benefits that include increasing discounts!`,
      proposedActions: [],
      validationResults: [],
      confidence: 0.95,
      needsEscalation: false,
    };
  }
}
