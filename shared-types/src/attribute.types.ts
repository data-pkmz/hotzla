export const AttributeType = {
  SELECT: 'SELECT',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  TEXT: 'TEXT',
  FILE_UPLOAD: 'FILE_UPLOAD',
} as const;

export type AttributeType = (typeof AttributeType)[keyof typeof AttributeType];

export const PricingImpactType = {
  NONE: 'NONE',
  PER_UNIT_MULTIPLIER: 'PER_UNIT_MULTIPLIER',
  FLAT_ADD_PER_OPTION: 'FLAT_ADD_PER_OPTION',
} as const;

export type PricingImpactType = (typeof PricingImpactType)[keyof typeof PricingImpactType];

export const PriceModifierType = {
  FIXED_ADD: 'FIXED_ADD',
  MULTIPLY: 'MULTIPLY',
} as const;

export type PriceModifierType = (typeof PriceModifierType)[keyof typeof PriceModifierType];

export const AttributeDisplayStyle = {
  CARDS: 'CARDS',
  DROPDOWN: 'DROPDOWN',
  NUMBER_INPUT: 'NUMBER_INPUT',
  SINGLE_LINE: 'SINGLE_LINE',
  MULTI_LINE: 'MULTI_LINE',
  CHECKBOX: 'CHECKBOX',
  SWITCH: 'SWITCH',
  FILE_DROPZONE: 'FILE_DROPZONE',
} as const;

export type AttributeDisplayStyle =
  (typeof AttributeDisplayStyle)[keyof typeof AttributeDisplayStyle];

export interface ProductAttributeOptionDto {
  id?: string;
  optionLabel: string;
  optionValue: string;
  priceModifier?: number;
  priceModifierType?: PriceModifierType;
  displayOrder?: number;
  isPerUnit?: boolean;
}

export interface CreateAttributeDto {
  productId: string;
  attributeName: string;
  attributeType: AttributeType;
  displayStyle: AttributeDisplayStyle;
  isRequired?: boolean;
  displayOrder?: number;
  pricingRule?: PricingImpactType;
  unitPrice?: number;
  minValue?: number;
  maxValue?: number;
  options?: ProductAttributeOptionDto[];
}

export type UpdateAttributeDto = Partial<CreateAttributeDto>;
