// Pricing types - set by marketing, read-only for customer agents
import type { UUID, ISODateTime, CustomerTier, ProductType } from './index';

export interface ProductPrice {
  basePrice: number;
  cost: number;
  minMargin: number;
  displayName: string;
  description: string;
}

export interface TierBenefit {
  discountPercent: number;
  freeShippingThreshold: number;
  prioritySupport: boolean;
  earlyAccess: boolean;
  maxDiscountStack: number;
}

export interface PromotionConditions {
  minOrderValue?: number;
  minItems?: number;
  applicableProducts?: ProductType[];
  applicableTiers?: CustomerTier[];
  newCustomersOnly?: boolean;
}

export interface Promotion {
  id: UUID;
  name: string;
  description: string;
  type: 'percentage' | 'fixed' | 'shipping' | 'bogo';
  value: number;
  conditions: PromotionConditions;
  validFrom: ISODateTime;
  validUntil: ISODateTime;
  active: boolean;
  usageLimit: number;
  usageCount: number;
}

export interface DiscountCode {
  code: string;
  promotionId: UUID;
  validFrom: ISODateTime;
  validUntil: ISODateTime;
  active: boolean;
  singleUse: boolean;
  usedBy: string[];
}

export interface PricingConstraints {
  absoluteMinMargin: number;
  maxDiscountPercent: number;
  maxStackedDiscount: number;
}

export interface PricingConfig {
  version: string;
  updatedAt: ISODateTime;
  updatedBy?: string;
  basePrices: Record<ProductType, ProductPrice>;
  tierBenefits: Record<CustomerTier, TierBenefit>;
  activePromotions: Promotion[];
  discountCodes: DiscountCode[];
  constraints: PricingConstraints;
}

// Default pricing configuration
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
  basePrices: {
    print_small: { basePrice: 15, cost: 5, minMargin: 0.15, displayName: '5x7 Print', description: 'Small format print' },
    print_medium: { basePrice: 25, cost: 8, minMargin: 0.15, displayName: '8x10 Print', description: 'Medium format print' },
    print_large: { basePrice: 45, cost: 15, minMargin: 0.15, displayName: '11x14 Print', description: 'Large format print' },
    print_xlarge: { basePrice: 75, cost: 25, minMargin: 0.15, displayName: '16x20 Print', description: 'Extra large format print' },
    canvas: { basePrice: 120, cost: 40, minMargin: 0.15, displayName: 'Canvas Print', description: 'Gallery-wrapped canvas' },
    poster: { basePrice: 35, cost: 10, minMargin: 0.15, displayName: '18x24 Poster', description: 'Large format poster' },
  },
  tierBenefits: {
    standard: { discountPercent: 0, freeShippingThreshold: 100, prioritySupport: false, earlyAccess: false, maxDiscountStack: 20 },
    silver: { discountPercent: 5, freeShippingThreshold: 75, prioritySupport: false, earlyAccess: false, maxDiscountStack: 30 },
    gold: { discountPercent: 10, freeShippingThreshold: 50, prioritySupport: true, earlyAccess: true, maxDiscountStack: 40 },
    platinum: { discountPercent: 15, freeShippingThreshold: 0, prioritySupport: true, earlyAccess: true, maxDiscountStack: 50 },
  },
  activePromotions: [],
  discountCodes: [],
  constraints: {
    absoluteMinMargin: 0.15,
    maxDiscountPercent: 50,
    maxStackedDiscount: 60,
  },
};
