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
export type AttributeType = 'SELECT' | 'NUMBER' | 'BOOLEAN' | 'TEXT' | 'FILE_UPLOAD';
export type PricingRule = 'NONE' | 'PER_UNIT_MULTIPLIER' | 'FLAT_ADD_PER_OPTION';

export type PriceModifierType = 'FIXED_ADD' | 'MULTIPLY';

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
