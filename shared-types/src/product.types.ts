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
  minQuantity: number;
  maxQuantity: number | null;
  createdBy: string | null;
  createdAt: Date | string;
  attributeDefinitionEntries?: ProductAttributeDefinition[];
}

export type PricingRule = PricingImpactType;

export interface ProductAttributeDefinition {
  id: string;
  productId: string;
  attributeName: string;
  attributeType: AttributeType;
  displayStyle: AttributeDisplayStyle;
  isRequired: boolean;
  displayOrder: number;
  pricingRule: PricingRule;
  unitPrice: number | null;
  minValue: number | null;
  maxValue: number | null;
  options?: ProductAttributeOption[];
  attributeOptionEntries?: ProductAttributeOption[];
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

export type AttributeDisplayStyle =
  | 'DROPDOWN'
  | 'CARDS'
  | 'NUMBER_INPUT'
  | 'CHECKBOX'
  | 'SWITCH'
  | 'SINGLE_LINE'
  | 'MULTI_LINE'
  | 'FILE_DROPZONE';

export interface ProductDetails extends Product {
  attributes: ProductAttributeDefinition[];
}
