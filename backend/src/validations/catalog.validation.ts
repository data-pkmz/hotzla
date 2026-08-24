import { z } from 'zod';

/**
 * Validation for creating a product.
 */
export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required'),
  description: z.string().trim().min(1, 'Product description is required'),
  category: z.string().trim().min(1, 'Product category is required'),
  productType: z.enum(['FIXED', 'DYNAMIC']),
  basePrice: z.number().nonnegative('Base price cannot be negative'),
  createdBy: z.string().uuid().optional(),
});

/**
 * Validation for updating a product.
 *
 * All fields are optional because PUT requests may update
 * individual product properties.
 */
export const updateProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name cannot be empty').optional(),
  description: z.string().trim().min(1, 'Product description cannot be empty').optional(),
  category: z.string().trim().min(1, 'Product category cannot be empty').optional(),
  productType: z.enum(['FIXED', 'DYNAMIC']).optional(),
  basePrice: z.number().nonnegative('Base price cannot be negative').optional(),

  /**
   * isActive controls whether the product is currently
   * available in the catalogue.
   *
   * This is different from isDeleted, which is handled
   * by the DELETE endpoint.
   */
  isActive: z.boolean().optional(),
});

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
    displayStyle: z.enum(['DROPDOWN', 'CARDS', 'CHECKBOX', 'SWITCH', 'SINGLE_LINE', 'MULTI_LINE']),
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
