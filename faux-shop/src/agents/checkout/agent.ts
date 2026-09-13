// Checkout agent - handles cart and payment flow
import type { Env, ProductType } from '../../types';
import type { AssembledContext } from '../../session/context-assembly';
import type { Logger } from '../../observability/logger';
import { BaseAgent, type AgentResponse } from '../base-agent';
import type { ProposedAction } from '../../types/validation';
import type { CheckoutTask, CartItem, AppliedDiscount } from '../../types/session';
import { PricingService } from '../../pricing/service';

const CHECKOUT_PROMPT = `You are a checkout assistant for Nano Banana Print Shop, helping customers complete their purchases.

Your role is to:
1. Help customers review their cart
2. Explain pricing, discounts, and shipping
3. Guide them through the checkout process
4. Answer questions about products and sizes
5. Process orders once payment is complete

Product sizes and prices are fixed by our pricing system. You can:
- Explain current tier benefits
- Apply valid discount codes (verify they exist in the system)
- Explain active promotions

CRITICAL RULES (Non-negotiable):
- You CANNOT create, modify, or negotiate discounts
- You CANNOT change base prices
- You CANNOT ship orders without completed payment
- You CANNOT promise future discounts
- All discounts must come from the pricing system
- If a customer asks for a special deal, politely explain you cannot negotiate

Response Format:
1. Summarize the cart if relevant
2. Explain any discounts being applied
3. Provide clear next steps
4. Include confidence level (high/medium/low)

Remember: Be helpful with the checkout process, but prices are not negotiable.`;

export class CheckoutAgent extends BaseAgent {
  private pricingService: PricingService;

  constructor(env: Env, logger: Logger) {
    super(env, {
      agentId: 'checkout',
      systemPrompt: CHECKOUT_PROMPT,
      maxTokens: 1024,
      temperature: 0.5, // More deterministic for checkout
    }, logger);
    this.pricingService = new PricingService(env);
  }

  protected parseResponse(text: string): Omit<AgentResponse, 'validationResults' | 'needsEscalation' | 'escalationReason'> {
    let confidence = 0.85;
    const confidenceMatch = text.match(/confidence[:\s]*(high|medium|low)/i);
    if (confidenceMatch) {
      switch (confidenceMatch[1].toLowerCase()) {
        case 'high': confidence = 0.95; break;
        case 'medium': confidence = 0.8; break;
        case 'low': confidence = 0.6; break;
      }
    }

    const proposedActions: ProposedAction[] = [];

    // Check for discount code application
    const codeMatch = text.match(/appl(?:y|ied)\s+(?:discount\s+)?code[:\s]+([A-Z0-9]+)/i);
    if (codeMatch) {
      proposedActions.push({
        type: 'apply_discount',
        agentId: this.config.agentId,
        timestamp: new Date().toISOString(),
        parameters: {
          code: codeMatch[1].toUpperCase(),
        },
        confidence,
      });
    }

    const cleanMessage = text.replace(/\n*confidence[:\s]*(high|medium|low)/gi, '').trim();

    return {
      message: cleanMessage,
      proposedActions,
      confidence,
    };
  }

  async calculateCartTotal(
    context: AssembledContext,
    items: CartItem[],
    discountCode?: string
  ): Promise<{
    summary: string;
    pricingResult: Awaited<ReturnType<PricingService['calculateCart']>>;
  }> {
    const customer = {
      id: context.customerId,
      tier: context.customer.tier as any,
      standing: context.customer.standing as any,
      aggregateMetrics: {
        totalOrders: context.customer.totalOrders,
        totalSpent: context.customer.totalSpent,
        refundRate: context.customer.refundRate,
        accountAgeDays: context.customer.accountAgeDays,
        generationsTotal: 0,
      },
      createdAt: new Date().toISOString(),
      flags: [],
      orderHistory: [],
      refundHistory: [],
    };

    const pricingResult = await this.pricingService.calculateCart(items, customer, discountCode);

    let summary = `**Cart Summary**\n`;
    summary += `Subtotal: $${pricingResult.subtotal.toFixed(2)}\n`;

    if (pricingResult.appliedDiscounts.length > 0) {
      summary += `\n**Applied Discounts:**\n`;
      for (const discount of pricingResult.appliedDiscounts) {
        summary += `- ${discount.description}: -$${discount.amount.toFixed(2)}\n`;
      }
    }

    summary += `\nShipping: ${pricingResult.shipping > 0 ? `$${pricingResult.shipping.toFixed(2)}` : 'FREE'}\n`;
    summary += `Tax: $${pricingResult.tax.toFixed(2)}\n`;
    summary += `**Total: $${pricingResult.total.toFixed(2)}**\n`;

    if (pricingResult.warnings.length > 0) {
      summary += `\n*Note: ${pricingResult.warnings.join('; ')}*`;
    }

    return { summary, pricingResult };
  }

  async explainTierBenefits(tier: string): Promise<string> {
    const benefits = await this.pricingService.getTierBenefits(tier as any);

    return `**Your ${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier Benefits:**
- ${benefits.discountPercent}% automatic discount on all purchases
- Free shipping on orders over $${benefits.freeShippingThreshold}
${benefits.prioritySupport ? '- Priority customer support\n' : ''}${benefits.earlyAccess ? '- Early access to new products\n' : ''}- Up to ${benefits.maxDiscountStack}% maximum discount stacking`;
  }

  async addToCart(
    task: CheckoutTask | null,
    productType: ProductType,
    imageVersionId: string,
    quantity: number
  ): Promise<{
    cart: CartItem[];
    message: string;
  }> {
    const price = await this.pricingService.getProductPrice(productType);
    const itemId = crypto.randomUUID();

    const newItem: CartItem = {
      id: itemId,
      productType,
      imageVersionId,
      quantity,
      unitPrice: price,
      lineTotal: price * quantity,
    };

    const existingItems = task?.cartItems || [];
    const cart = [...existingItems, newItem];

    const productNames: Record<ProductType, string> = {
      print_small: '5x7 Print',
      print_medium: '8x10 Print',
      print_large: '11x14 Print',
      print_xlarge: '16x20 Print',
      canvas: 'Canvas Print',
      poster: '18x24 Poster',
    };

    return {
      cart,
      message: `Added ${quantity}x ${productNames[productType]} to your cart at $${price.toFixed(2)} each.`,
    };
  }

  handleDiscountNegotiation(): AgentResponse {
    return {
      message: `I appreciate you asking, but I'm not able to create custom discounts or negotiate prices - those are set by our pricing system.

Here's what I can do:
1. **Check for active promotions** that might apply to your order
2. **Apply a discount code** if you have one
3. **Explain your tier benefits** - as a returning customer, you may already have automatic discounts!

Would you like me to check what's available for your order?`,
      proposedActions: [],
      validationResults: [],
      confidence: 0.95,
      needsEscalation: false,
    };
  }
}
