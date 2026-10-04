import { z } from 'zod';

import { AttributeType, PricingImpactType, PriceModifierType } from 'shared-types';

const getEnumValues = <T extends Record<string, string>>(obj: T) =>
  Object.values(obj) as [string, ...string[]];

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const ProductAttributeOptionSchema = z.object({
  id: z.string().regex(uuidRegex, 'Invalid UUID').optional(),

  optionLabel: z.string().trim().min(1, 'Option label is required'),

  optionValue: z.string().trim().min(1, 'Option value is required'),

  priceModifier: z.number().nonnegative('Price modifier cannot be negative').optional().default(0),

  priceModifierType: z
    .enum(getEnumValues(PriceModifierType))
    .optional()
    .default(PriceModifierType.FIXED_ADD),

  displayOrder: z
    .number()
    .int()
    .nonnegative('Display order cannot be negative')
    .optional()
    .default(0),

  isPerUnit: z.boolean().optional().default(false),
});

const CreateAttributeBaseSchema = z.object({
  productId: z.string().regex(uuidRegex, 'Invalid UUID'),

  attributeName: z.string().trim().min(1, 'Attribute name is required'),

  attributeType: z.enum(getEnumValues(AttributeType)),

  isRequired: z.boolean().optional().default(false),

  displayOrder: z
    .number()
    .int()
    .nonnegative('Display order cannot be negative')
    .optional()
    .default(0),

  pricingRule: z.enum(getEnumValues(PricingImpactType)).optional().default(PricingImpactType.NONE),

  unitPrice: z.number().nonnegative('Unit price cannot be negative').optional(),

  minValue: z.number().nonnegative('Minimum value cannot be negative').optional(),

  maxValue: z.number().nonnegative('Maximum value cannot be negative').optional(),

  options: z.array(ProductAttributeOptionSchema).optional(),
});

const refineLogic = (
  data: {
    attributeType?: string;
    isRequired?: boolean;
    pricingRule?: string;
    unitPrice?: number;
    minValue?: number;
    maxValue?: number;
    options?: unknown[];
  },
  ctx: z.RefinementCtx
) => {
  if (data.attributeType === AttributeType.SELECT) {
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({
        code: 'custom',
        message: 'SELECT attribute must contain at least 2 choice options.',
        path: ['options'],
      });
    }
  }

  if (
    data.attributeType &&
    data.attributeType !== AttributeType.SELECT &&
    data.options &&
    data.options.length > 0
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'Only SELECT attributes can have options.',
      path: ['options'],
    });
  }

  if (data.minValue !== undefined && data.maxValue !== undefined && data.minValue > data.maxValue) {
    ctx.addIssue({
      code: 'custom',
      message: 'Minimum value cannot be greater than maximum value.',
      path: ['maxValue'],
    });
  }

  if (data.attributeType === AttributeType.FILE_UPLOAD) {
    if (data.isRequired === false) {
      ctx.addIssue({
        code: 'custom',
        message: 'FILE_UPLOAD attribute must be required.',
        path: ['isRequired'],
      });
    }

    if (data.pricingRule !== undefined && data.pricingRule !== PricingImpactType.NONE) {
      ctx.addIssue({
        code: 'custom',
        message: 'FILE_UPLOAD attribute cannot have a pricing rule.',
        path: ['pricingRule'],
      });
    }

    if (data.unitPrice !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'FILE_UPLOAD attribute cannot have a unit price.',
        path: ['unitPrice'],
      });
    }
  }
};

export const CreateAttributeSchema = CreateAttributeBaseSchema.superRefine(refineLogic);

export const UpdateAttributeSchema = CreateAttributeBaseSchema.partial().superRefine(refineLogic);

export const UpdateDisplayOrderSchema = z.array(
  z.object({
    id: z.string().regex(uuidRegex, 'Invalid UUID'),

    displayOrder: z.number().int().nonnegative('Display order cannot be negative'),
  })
);
