export const AttributeType = {
  SELECT: 'SELECT',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  TEXT: 'TEXT',
  FILE_UPLOAD: 'FILE_UPLOAD',
} as const;
export type AttributeType = (typeof AttributeType)[keyof typeof AttributeType];

export const SelectionMode = { DROPDOWN: 'DROPDOWN', FLAT: 'FLAT', MULTI: 'MULTI' } as const;
export type SelectionMode = (typeof SelectionMode)[keyof typeof SelectionMode];

export const FileTypeMode = { IMAGE: 'IMAGE', PDF: 'PDF', IMAGE_AND_PDF: 'IMAGE_AND_PDF' } as const;
export type FileTypeMode = (typeof FileTypeMode)[keyof typeof FileTypeMode];

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
  isRequired?: boolean;
  displayOrder?: number;
  pricingRule?: PricingImpactType;
  unitPrice?: number;
  minValue?: number;
  maxValue?: number;
  selectionMode?: SelectionMode;
  isMultipleSelection?: boolean;
  maxLength?: number;
  allowedFileTypes?: FileTypeMode;
  allowMultipleFiles?: boolean;
  options?: ProductAttributeOptionDto[];
}

export type UpdateAttributeDto = Partial<CreateAttributeDto>;
