export enum AttributeType {
  SELECT = 'SELECT',
  NUMBER = 'NUMBER',
  CHECKBOX = 'CHECKBOX',
  TEXT = 'TEXT',
  FILE_UPLOAD = 'FILE_UPLOAD',
}

export enum PricingImpactType {
  NONE = 'NONE',
  PER_UNIT_MULTIPLIER = 'PER_UNIT_MULTIPLIER',
  FLAT_ADD_PER_OPTION = 'FLAT_ADD_PER_OPTION',
}

export enum PriceModifierType {
  FIXED_ADD = 'FIXED_ADD',
  MULTIPLY = 'MULTIPLY',
}

export interface ProductAttributeOptionDto {
  id?: string;
  optionLabel: string;
  optionValue: string;
  priceModifier?: number;
  priceModifierType?: PriceModifierType;
  isPerUnit?: boolean;
  displayOrder?: number;
}

export interface CreateAttributeDto {
  productId: string;
  attributeName: string;
  attributeType: AttributeType;
  isRequired?: boolean;
  displayOrder?: number;
  pricingRule?: PricingImpactType;
  unitPrice?: number;
  minValue?: number;
  maxValue?: number;
  options?: ProductAttributeOptionDto[];
}

export type UpdateAttributeDto = Partial<CreateAttributeDto>;
