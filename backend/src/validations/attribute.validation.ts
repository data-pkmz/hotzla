import { z } from 'zod';
import {
  AttributeType,
  PricingImpactType,
  PriceModifierType,
} from 'shared-types/dist/attribute.types';

const getEnumValues = <T extends Record<string, string>>(obj: T) =>
  Object.values(obj) as [string, ...string[]];

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const ProductAttributeOptionSchema = z.object({
  id: z.string().regex(uuidRegex, 'Invalid UUID').optional(),
  optionLabel: z.string().min(1, 'Option label is required'),
  optionValue: z.string().min(1, 'Option value is required'),
  priceModifier: z.number().optional().default(0),
  priceModifierType: z
    .enum(getEnumValues(PriceModifierType))
    .optional()
    .default(PriceModifierType.FIXED_ADD),
  displayOrder: z.number().optional(),
});

const CreateAttributeBaseSchema = z.object({
  productId: z.string().regex(uuidRegex, 'Invalid UUID'),
  attributeName: z.string().min(1, 'Attribute name is required'),
  attributeType: z.enum(getEnumValues(AttributeType)),
  isRequired: z.boolean().optional().default(false),
  displayOrder: z.number().optional().default(0),
  pricingRule: z.enum(getEnumValues(PricingImpactType)).optional().default(PricingImpactType.NONE),
  unitPrice: z.number().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  options: z.array(ProductAttributeOptionSchema).optional(),
});

const refineLogic = (
  data: { attributeType?: string; options?: unknown[] },
  ctx: z.RefinementCtx
) => {
  // 1. SELECT requires at least 2 options
  if (data.attributeType === AttributeType.SELECT) {
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({
        code: 'custom',
        message: 'SELECT attribute must contain at least 2 choice options.',
        path: ['options'],
      });
    }
  }

  // 2. Only SELECT can have options
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
};

export const CreateAttributeSchema = CreateAttributeBaseSchema.superRefine(refineLogic);

export const UpdateAttributeSchema = CreateAttributeBaseSchema.partial().superRefine(refineLogic);

export const UpdateDisplayOrderSchema = z.array(
  z.object({
    id: z.string().regex(uuidRegex, 'Invalid UUID'),
    displayOrder: z.number().int().min(0),
  })
);
