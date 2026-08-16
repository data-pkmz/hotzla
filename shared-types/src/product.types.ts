import type { AttributeType, PriceModifierType, PricingImpactType } from './attribute.types.js';

// Product types

export type ProductType = 'FIXED' | 'DYNAMIC';

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  productType: ProductType;
  basePrice: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date | string;
}

// Attribute Definitions
export type { AttributeType, PriceModifierType };
export type PricingRule = PricingImpactType;

export interface ProductAttributeDefinition {
  id: string;
  productId: string;
  attributeName: string;
  attributeType: AttributeType;
  isRequired: boolean;
  displayOrder: number;
  pricingRule: PricingRule;
  unitPrice: number | null;
  minValue: number | null;
  maxValue: number | null;
  options?: ProductAttributeOption[];
}

export interface ProductAttributeOption {
  id: string;
  attributeDefinitionId: string;
  optionLabel: string;
  optionValue: string;
  priceModifier: number;
  priceModifierType: PriceModifierType;
  isPerUnit: boolean;
  displayOrder: number;
}
