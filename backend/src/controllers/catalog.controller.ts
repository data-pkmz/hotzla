import { Request, Response } from 'express';

import { CatalogService } from '../services/catalog.service';
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
} from '../validations/catalog.validation';
import logger from '../utils/logger';

/**
 * Product details returned by the catalog service.
 *
 * Includes product attribute definitions and their options.
 */
type ProductDetailsRecord = NonNullable<
  Awaited<ReturnType<typeof CatalogService.getProductDetails>>
>;

/**
 * Converts a product's Prisma representation into the
 * structure expected by the frontend.
 *
 * Used by both public and administrative product detail endpoints.
 *
 * Converts Decimal prices and numeric limits to JavaScript numbers.
 */
const formatProductDetails = (product: ProductDetailsRecord) => {
  const { attributeDefinitionEntries, ...productData } = product;

  const attributes = attributeDefinitionEntries.map((attribute) => ({
    id: attribute.id,
    productId: attribute.productId,
    attributeName: attribute.attributeName,
    attributeType: attribute.attributeType,
    displayStyle: attribute.displayStyle,
    isRequired: attribute.isRequired,
    displayOrder: attribute.displayOrder,
    pricingRule: attribute.pricingRule,
    unitPrice: attribute.unitPrice?.toNumber() ?? null,
    minValue: attribute.minValue?.toNumber() ?? null,
    maxValue: attribute.maxValue?.toNumber() ?? null,
    options: attribute.attributeOptionEntries.map((option) => ({
      id: option.id,
      attributeDefinitionId: option.attributeDefinitionId,
      optionLabel: option.optionLabel,
      optionValue: option.optionValue,
      priceModifier: option.priceModifier.toNumber(),
      priceModifierType: option.priceModifierType,
      isPerUnit: option.isPerUnit,
      displayOrder: option.displayOrder,
    })),
  }));

  return {
    ...productData,
    basePrice: product.basePrice.toNumber(),
    attributes,
  };
};

/**
 * Retrieves products available in the public catalog.
 *
 * Only active products should be returned by CatalogService.getProducts.
 *
 * Supports optional case-insensitive category filtering.
 *
 * Route:
 * - GET /api/products
 *
 * Responses:
 * - 200: Products retrieved successfully.
 * - 500: Unexpected server error.
 */
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;

    const productsFromCatalog = await CatalogService.getProducts();

    const products = category
      ? productsFromCatalog.filter(
          (product) => product.category.toLowerCase() === String(category).toLowerCase()
        )
      : productsFromCatalog;

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    logger.error('Failed to retrieve catalog products', { error });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Retrieves the details of an active product.
 *
 * Includes attribute definitions and their available options.
 *
 * Route:
 * - GET /api/products/:id
 *
 * Responses:
 * - 200: Product retrieved successfully.
 * - 400: Invalid product ID.
 * - 404: Active product not found.
 * - 500: Unexpected server error.
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  const parsedId = productIdSchema.safeParse(req.params);

  if (!parsedId.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid product ID',
    });
    return;
  }

  const { id } = parsedId.data;

  try {
    const product = await CatalogService.getProductDetails(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: formatProductDetails(product),
    });
  } catch (error) {
    logger.error('Failed to retrieve product details', {
      error,
      productId: id,
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Retrieves all products for the manager catalog.
 *
 * Includes active and inactive products.
 *
 * The service must not apply the public catalog's
 * active-product filter.
 *
 * Route:
 * - GET /api/admin/products
 *
 * Authorization:
 * - MANAGER only, enforced by the admin catalog router.
 *
 * Responses:
 * - 200: Products retrieved successfully.
 * - 500: Unexpected server error.
 */
export const getAllAdminProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await CatalogService.getAllAdminProducts();

    res.status(200).json({
      success: true,
      data: products.map((product) => ({
        ...product,
        basePrice: product.basePrice.toNumber(),
      })),
    });
  } catch (error) {
    logger.error('Failed to retrieve admin catalog products', {
      error,
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Retrieves full product details for management and editing.
 *
 * Unlike the public endpoint, inactive products can also
 * be retrieved.
 *
 * Includes product attribute definitions and options,
 * preserving their IDs for future updates.
 *
 * Route:
 * - GET /api/admin/products/:id
 *
 * Authorization:
 * - MANAGER only.
 *
 * Responses:
 * - 200: Product retrieved successfully.
 * - 400: Invalid product ID.
 * - 404: Product not found.
 * - 500: Unexpected server error.
 */
export const getAdminProductById = async (req: Request, res: Response): Promise<void> => {
  const parsedId = productIdSchema.safeParse(req.params);

  if (!parsedId.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid product ID',
    });
    return;
  }

  const { id } = parsedId.data;

  try {
    const product = await CatalogService.getAdminProductDetails(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: formatProductDetails(product),
    });
  } catch (error) {
    logger.error('Failed to retrieve admin product details', {
      error,
      productId: id,
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Creates a new catalog product.
 *
 * Validates the request body and calls the catalog service.
 *
 * Route:
 * - POST /api/admin/products
 *
 * Authorization:
 * - MANAGER only.
 *
 * Responses:
 * - 201: Product created successfully.
 * - 400: Validation or creation failed.
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createProductSchema.parse(req.body);

    const newProduct = await CatalogService.createProduct(validatedData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        ...newProduct,
        basePrice: newProduct.basePrice.toNumber(),
      },
    });
  } catch (error) {
    logger.error('Failed to create product', { error });

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create product',
    });
  }
};

/**
 * Updates an existing catalog product.
 *
 * Validates the product ID and update request body.
 *
 * Route:
 * - PUT /api/admin/products/:id
 *
 * Authorization:
 * - MANAGER only.
 *
 * Responses:
 * - 200: Product updated successfully.
 * - 400: Validation or update failed.
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = productIdSchema.parse(req.params);
    const validatedData = updateProductSchema.parse(req.body);

    const updatedProduct = await CatalogService.updateProduct(id, validatedData);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: {
        ...updatedProduct,
        basePrice: updatedProduct.basePrice.toNumber(),
      },
    });
  } catch (error) {
    logger.error('Failed to update product', {
      error,
      productId: req.params.id,
    });

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update product',
    });
  }
};

/**
 * Soft-deletes an existing catalog product.
 *
 * The product is disabled rather than permanently
 * deleted from the database.
 *
 * Route:
 * - DELETE /api/admin/products/:id
 *
 * Authorization:
 * - MANAGER only.
 *
 * Responses:
 * - 200: Product successfully removed.
 * - 400: Validation or deletion failed.
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = productIdSchema.parse(req.params);

    await CatalogService.softDeleteProduct(id);

    res.status(200).json({
      success: true,
      message: 'Product removed successfully',
    });
  } catch (error) {
    logger.error('Failed to delete product', {
      error,
      productId: req.params.id,
    });

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete product',
    });
  }
};
