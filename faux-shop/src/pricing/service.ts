// Pricing service - READ-ONLY for customer-facing agents
// Discounts are set by marketing, never negotiated
import type { Env, CustomerTier, ProductType } from '../types';
import type { PricingConfig, Promotion, DiscountCode, TierBenefit } from '../types/pricing';
import { DEFAULT_PRICING_CONFIG } from '../types/pricing';
import type { Customer } from '../types/customer';
import type { CartItem, AppliedDiscount } from '../types/session';

const PRICING_CACHE_KEY = 'pricing:config:current';
const PRICING_CACHE_TTL = 300; // 5 minutes

export interface PricingResult {
  subtotal: number;
  tierDiscount: number;
  promotionDiscount: number;
  codeDiscount: number;
  shipping: number;
  tax: number;
  total: number;
  appliedDiscounts: AppliedDiscount[];
  warnings: string[];
}

export class PricingService {
  private cache: KVNamespace;
  private db: D1Database;

  constructor(env: Env) {
    this.cache = env.PRICING_CACHE;
    this.db = env.DB;
  }

  // READ-ONLY: Get current pricing configuration
  async getPricingConfig(): Promise<PricingConfig> {
    // Try cache first
    const cached = await this.cache.get(PRICING_CACHE_KEY, 'json');
    if (cached) {
      return cached as PricingConfig;
    }

    // Load from database (or return default)
    try {
      const result = await this.db
        .prepare('SELECT config_json FROM pricing_config WHERE id = 1')
        .first<{ config_json: string }>();

      if (result) {
        const config = JSON.parse(result.config_json) as PricingConfig;
        await this.cache.put(PRICING_CACHE_KEY, JSON.stringify(config), {
          expirationTtl: PRICING_CACHE_TTL,
        });
        return config;
      }
    } catch (error) {
      console.error('Error loading pricing config:', error);
    }

    return DEFAULT_PRICING_CONFIG;
  }

  // READ-ONLY: Get price for a product
  async getProductPrice(productType: ProductType): Promise<number> {
    const config = await this.getPricingConfig();
    return config.basePrices[productType]?.basePrice || 0;
  }

  // READ-ONLY: Get tier benefits
  async getTierBenefits(tier: CustomerTier): Promise<TierBenefit> {
    const config = await this.getPricingConfig();
    return config.tierBenefits[tier] || config.tierBenefits.standard;
  }

  // READ-ONLY: Calculate total for cart with all applicable discounts
  async calculateCart(
    items: CartItem[],
    customer: Customer,
    discountCode?: string
  ): Promise<PricingResult> {
    const config = await this.getPricingConfig();
    const appliedDiscounts: AppliedDiscount[] = [];
    const warnings: string[] = [];

    // Calculate subtotal
    let subtotal = 0;
    for (const item of items) {
      const price = config.basePrices[item.productType]?.basePrice || item.unitPrice;
      subtotal += price * item.quantity;
    }

    // Apply tier discount (automatic, not negotiated)
    const tierBenefits = config.tierBenefits[customer.tier];
    let tierDiscount = 0;
    if (tierBenefits.discountPercent > 0) {
      tierDiscount = subtotal * (tierBenefits.discountPercent / 100);
      appliedDiscounts.push({
        code: `TIER_${customer.tier.toUpperCase()}`,
        source: 'tier_benefit',
        type: 'percentage',
        amount: tierDiscount,
        description: `${customer.tier} tier: ${tierBenefits.discountPercent}% off`,
      });
    }

    // Apply automatic promotions
    let promotionDiscount = 0;
    const now = new Date().toISOString();
    for (const promo of config.activePromotions) {
      if (!promo.active) continue;
      if (promo.validFrom > now || promo.validUntil < now) continue;

      // Check conditions
      if (!this.checkPromotionConditions(promo, items, customer, subtotal)) continue;

      // Check usage limit
      if (promo.usageLimit > 0 && promo.usageCount >= promo.usageLimit) continue;

      const promoAmount = this.calculatePromotionDiscount(promo, subtotal);
      if (promoAmount > 0) {
        promotionDiscount += promoAmount;
        appliedDiscounts.push({
          code: promo.name,
          source: 'promotion',
          type: promo.type as AppliedDiscount['type'],
          amount: promoAmount,
          description: promo.description,
        });
      }
    }

    // Apply discount code if provided
    let codeDiscount = 0;
    if (discountCode) {
      const codeResult = await this.validateAndApplyCode(
        discountCode,
        customer,
        subtotal,
        config
      );
      if (codeResult.valid) {
        codeDiscount = codeResult.discount;
        appliedDiscounts.push({
          code: discountCode,
          source: 'promotion',
          type: codeResult.type as AppliedDiscount['type'],
          amount: codeDiscount,
          description: codeResult.description,
        });
      } else if (codeResult.error) {
        warnings.push(codeResult.error);
      }
    }

    // Check stacking limits
    const totalDiscount = tierDiscount + promotionDiscount + codeDiscount;
    const maxAllowed = subtotal * (tierBenefits.maxDiscountStack / 100);
    let finalDiscount = totalDiscount;

    if (totalDiscount > maxAllowed) {
      finalDiscount = maxAllowed;
      warnings.push(
        `Total discount capped at ${tierBenefits.maxDiscountStack}% (${customer.tier} tier limit)`
      );
    }

    // Check margin floor - HARD CONSTRAINT
    const minPrice = subtotal * (1 - config.constraints.absoluteMinMargin);
    if (subtotal - finalDiscount < minPrice) {
      finalDiscount = subtotal - minPrice;
      warnings.push('Discount adjusted to maintain minimum margin');
    }

    // Calculate shipping
    let shipping = 8.99; // Base shipping
    const postDiscountTotal = subtotal - finalDiscount;
    if (postDiscountTotal >= tierBenefits.freeShippingThreshold) {
      shipping = 0;
      appliedDiscounts.push({
        code: 'FREE_SHIPPING',
        source: 'tier_benefit',
        type: 'shipping',
        amount: 8.99,
        description: `Free shipping (orders over $${tierBenefits.freeShippingThreshold})`,
      });
    }

    // Calculate tax (simplified - would need real tax service)
    const taxableAmount = postDiscountTotal;
    const tax = taxableAmount * 0.08; // 8% tax rate

    const total = postDiscountTotal + shipping + tax;

    return {
      subtotal,
      tierDiscount,
      promotionDiscount,
      codeDiscount,
      shipping,
      tax,
      total: Math.max(0, total),
      appliedDiscounts,
      warnings,
    };
  }

  private checkPromotionConditions(
    promo: Promotion,
    items: CartItem[],
    customer: Customer,
    subtotal: number
  ): boolean {
    const conditions = promo.conditions;
    if (!conditions) return true;

    if (conditions.minOrderValue && subtotal < conditions.minOrderValue) return false;
    if (conditions.minItems && items.length < conditions.minItems) return false;
    if (conditions.applicableTiers && !conditions.applicableTiers.includes(customer.tier))
      return false;
    if (conditions.newCustomersOnly && customer.aggregateMetrics.totalOrders > 0) return false;

    return true;
  }

  private calculatePromotionDiscount(promo: Promotion, subtotal: number): number {
    switch (promo.type) {
      case 'percentage':
        return subtotal * (promo.value / 100);
      case 'fixed':
        return Math.min(promo.value, subtotal);
      case 'shipping':
        return 8.99; // Free shipping value
      default:
        return 0;
    }
  }

  private async validateAndApplyCode(
    code: string,
    customer: Customer,
    subtotal: number,
    config: PricingConfig
  ): Promise<{
    valid: boolean;
    discount: number;
    type: string;
    description: string;
    error?: string;
  }> {
    const discountCode = config.discountCodes.find(
      dc => dc.code.toUpperCase() === code.toUpperCase() && dc.active
    );

    if (!discountCode) {
      return { valid: false, discount: 0, type: '', description: '', error: 'Invalid discount code' };
    }

    const now = new Date().toISOString();
    if (discountCode.validFrom > now || discountCode.validUntil < now) {
      return { valid: false, discount: 0, type: '', description: '', error: 'Discount code has expired' };
    }

    if (discountCode.singleUse && discountCode.usedBy.includes(customer.id)) {
      return {
        valid: false,
        discount: 0,
        type: '',
        description: '',
        error: 'Discount code has already been used',
      };
    }

    // Find associated promotion
    const promo = config.activePromotions.find(p => p.id === discountCode.promotionId);
    if (!promo) {
      return { valid: false, discount: 0, type: '', description: '', error: 'Promotion not found' };
    }

    const discount = this.calculatePromotionDiscount(promo, subtotal);

    return {
      valid: true,
      discount,
      type: promo.type,
      description: promo.description || `${promo.value}% off with code ${code}`,
    };
  }

  // READ-ONLY: Get available promotions for display
  async getActivePromotions(): Promise<Promotion[]> {
    const config = await this.getPricingConfig();
    const now = new Date().toISOString();

    return config.activePromotions.filter(
      p => p.active && p.validFrom <= now && p.validUntil >= now
    );
  }

  // READ-ONLY: Explain why a discount cannot be applied
  explainDiscountRejection(code: string): string {
    return `The discount code "${code}" cannot be applied. Discounts are set by our marketing team and cannot be negotiated or created through customer service. I can help you find currently active promotions instead.`;
  }
}
