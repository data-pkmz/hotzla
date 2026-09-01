import { z } from 'zod';

export const productDefinitionOptionSchema = z.object({
  id: z.string().optional(),
  optionLabel: z.string().trim().min(1, 'Option label is required'),
  optionValue: z.string().trim().min(1, 'Option value is required'),
  priceModifier: z.number().optional().default(0),
  priceModifierType: z.enum(['FIXED_ADD', 'MULTIPLY']).optional().default('FIXED_ADD'),
  displayOrder: z.number().int().nonnegative().optional().default(0),
  isPerUnit: z.boolean().optional().default(false),
});

export const productDefinitionSchema = z.object({
  id: z.string().optional(),
  attributeName: z.string().trim().min(1, 'Attribute name is required'),
  attributeType: z.enum(['SELECT', 'NUMBER', 'BOOLEAN', 'TEXT', 'FILE_UPLOAD']),
  displayStyle: z
    .enum([
      'DROPDOWN',
      'CARDS',
      'NUMBER_INPUT',
      'CHECKBOX',
      'SWITCH',
      'SINGLE_LINE',
      'MULTI_LINE',
      'FILE_DROPZONE',
    ])
    .optional(),
  isRequired: z.boolean().optional().default(false),
  displayOrder: z.number().int().nonnegative().optional().default(0),
  pricingRule: z
    .enum(['NONE', 'PER_UNIT_MULTIPLIER', 'FLAT_ADD_PER_OPTION'])
    .optional()
    .default('NONE'),
  unitPrice: z.number().nullable().optional(),
  minValue: z.number().nullable().optional(),
  maxValue: z.number().nullable().optional(),
  options: z.array(productDefinitionOptionSchema).optional().default([]),
});

/**
 * Validation for creating a product.
 */
export const createProductSchema = z
  .object({
    name: z.string().trim().min(1, 'Product name is required'),
    description: z.string().trim().min(1, 'Product description is required'),
    category: z.string().trim().min(1, 'Product category is required'),
    productType: z.enum(['FIXED', 'DYNAMIC']).optional().default('DYNAMIC'),
    basePrice: z.number().nonnegative('Base price cannot be negative'),

    minQuantity: z
      .number()
      .int('Minimum quantity must be a whole number')
      .positive('Minimum quantity must be greater than zero')
      .optional()
      .default(1),

    maxQuantity: z
      .number()
      .int('Maximum quantity must be a whole number')
      .positive('Maximum quantity must be greater than zero')
      .nullable()
      .optional(),

    isActive: z.boolean().optional().default(true),
    imageUrl: z.string().optional().default(''),
    createdBy: z.string().uuid().optional(),
    definitions: z.array(productDefinitionSchema).optional(),
    attributes: z.array(productDefinitionSchema).optional(),
  })
  .refine((data) => data.maxQuantity == null || data.maxQuantity >= data.minQuantity, {
    message: 'Maximum quantity cannot be less than minimum quantity',
    path: ['maxQuantity'],
  });

/**
 * Validation for updating a product.
 *
 * All fields are optional because PUT requests may update
 * individual product properties.
 */
export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1, 'Product name cannot be empty').optional(),
    description: z.string().trim().min(1, 'Product description cannot be empty').optional(),
    category: z.string().trim().min(1, 'Product category cannot be empty').optional(),
    productType: z.enum(['FIXED', 'DYNAMIC']).optional(),
    basePrice: z.number().nonnegative('Base price cannot be negative').optional(),

    minQuantity: z
      .number()
      .int('Minimum quantity must be a whole number')
      .positive('Minimum quantity must be greater than zero')
      .optional(),

    maxQuantity: z
      .number()
      .int('Maximum quantity must be a whole number')
      .positive('Maximum quantity must be greater than zero')
      .nullable()
      .optional(),

    isActive: z.boolean().optional(),
    imageUrl: z.string().optional(),
    definitions: z.array(productDefinitionSchema).optional(),
    attributes: z.array(productDefinitionSchema).optional(),
  })
  .refine(
    (data) =>
      data.minQuantity === undefined ||
      data.maxQuantity === undefined ||
      data.maxQuantity === null ||
      data.maxQuantity >= data.minQuantity,
    {
      message: 'Maximum quantity cannot be less than minimum quantity',
      path: ['maxQuantity'],
    }
  );

/**
 * Validation for the product ID in routes such as:
 *
 * GET    /api/products/:id
 * PUT    /api/products/:id
 * DELETE /api/products/:id
 */
export const productIdSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

/**
 * Validation for creating a product attribute.
 */
export const createAttributeSchema = z
  .object({
    attributeName: z.string().trim().min(1, 'Attribute name is required'),
    attributeType: z.enum(['SELECT', 'NUMBER', 'BOOLEAN', 'TEXT', 'FILE_UPLOAD']),
    displayStyle: z.enum([
      'DROPDOWN',
      'CARDS',
      'CHECKBOX',
      'SWITCH',
      'SINGLE_LINE',
      'MULTI_LINE',
      'NUMBER_INPUT',
      'FILE_DROPZONE',
    ]),
    isRequired: z.boolean(),
    displayOrder: z.number().int().nonnegative('Display order cannot be negative'),
    pricingRule: z.enum(['NONE', 'PER_UNIT_MULTIPLIER', 'FLAT_ADD_PER_OPTION']),
    unitPrice: z.number().nonnegative('Unit price cannot be negative').optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
  })
  .refine(
    (data) =>
      data.minValue === undefined || data.maxValue === undefined || data.minValue <= data.maxValue,
    {
      message: 'Minimum value cannot be greater than maximum value',
      path: ['minValue'],
    }
  );

/**
 * Validation for updating a product attribute.
 */
export const updateAttributeSchema = z
  .object({
    attributeName: z.string().trim().min(1, 'Attribute name cannot be empty').optional(),
    attributeType: z.enum(['SELECT', 'NUMBER', 'BOOLEAN', 'TEXT', 'FILE_UPLOAD']).optional(),
    isRequired: z.boolean().optional(),
    displayOrder: z.number().int().nonnegative('Display order cannot be negative').optional(),
    pricingRule: z.enum(['NONE', 'PER_UNIT_MULTIPLIER', 'FLAT_ADD_PER_OPTION']).optional(),
    unitPrice: z.number().nonnegative('Unit price cannot be negative').optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
  })
  .refine(
    (data) =>
      data.minValue === undefined || data.maxValue === undefined || data.minValue <= data.maxValue,
    {
      message: 'Minimum value cannot be greater than maximum value',
      path: ['minValue'],
    }
  );

/**
 * Validation for an attribute ID in:
 *
 * PUT    /api/attributes/:id
 * DELETE /api/attributes/:id
 */
export const attributeIdSchema = z.object({
  id: z.string().uuid('Invalid attribute ID'),
});
