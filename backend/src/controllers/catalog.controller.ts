import { Request, Response } from 'express';

import { CatalogService } from '../services/catalog.service';
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
} from '../validations/catalog.validation';
import logger from '../utils/logger';

/**
 * Retrieves the list of products available in the catalog.
 *
 * Expects:
 * - req.query.category: Optional category name used to filter the returned products.
 *
 * Does:
 * - Calls CatalogService.getProducts to retrieve the catalog products.
 * - If a category query parameter is provided, filters the products by category.
 * - Category matching is case-insensitive.
 *
 * Sends:
 * - 200 with success=true and the matching products.
 * - 500 with success=false if the products cannot be retrieved.
 *
 * Route:
 * - GET /api/products
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
 * Retrieves the full details of a single product.
 *
 * Expects:
 * - req.params.id: ID of the product to retrieve.
 *
 * Does:
 * - Calls CatalogService.getProductDetails to retrieve the product together
 *   with its non-deleted attribute definitions and available options.
 * - Returns 404 if no matching active product exists.
 * - Converts Prisma Decimal values such as prices and numeric limits into
 *   regular JavaScript numbers before sending them to the frontend.
 * - Builds the product attributes structure expected by the frontend.
 *
 * Sends:
 * - 200 with success=true and the complete product details.
 * - 404 with success=false if the product cannot be found.
 * - 500 with success=false if an unexpected error occurs.
 *
 * Route:
 * - GET /api/products/:id
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await CatalogService.getProductDetails(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

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

    res.status(200).json({
      success: true,
      data: {
        ...productData,
        basePrice: product.basePrice.toNumber(),
        attributes,
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve product details', {
      error,
      productId: req.params.id,
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
 * Expects:
 * - req.body: Product creation data matching createProductSchema.
 * - The route is expected to be protected so that only authorized
 *   administrative users can create products.
 *
 * Does:
 * - Validates the request body using createProductSchema.
 * - Calls CatalogService.createProduct with the validated product data.
 * - Converts the product's Prisma Decimal base price into a regular
 *   JavaScript number before returning it.
 *
 * Sends:
 * - 201 with success=true, a success message, and the created product.
 * - 400 with success=false if validation or product creation fails.
 *
 * Route:
 * - POST /api/admin/products
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
 * Expects:
 * - req.params.id: Product ID matching productIdSchema.
 * - req.body: Product update data matching updateProductSchema.
 * - The route is expected to be protected so that only authorized
 *   administrative users can update products.
 *
 * Does:
 * - Validates the product ID from the route parameters.
 * - Validates the submitted product data.
 * - Calls CatalogService.updateProduct with the validated ID and update data.
 * - Converts the updated product's Prisma Decimal base price into a regular
 *   JavaScript number before returning it.
 *
 * Sends:
 * - 200 with success=true, a success message, and the updated product.
 * - 400 with success=false if validation or the update operation fails.
 *
 * Route:
 * - PUT /api/admin/products/:id
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
 * Expects:
 * - req.params.id: Product ID matching productIdSchema.
 * - The route is expected to be protected so that only authorized
 *   administrative users can remove products.
 *
 * Does:
 * - Validates the product ID from the route parameters.
 * - Calls CatalogService.softDeleteProduct.
 * - The product is disabled/soft-deleted rather than permanently removed
 *   from the database.
 *
 * Sends:
 * - 200 with success=true after the product is successfully removed.
 * - 400 with success=false if validation or the delete operation fails.
 *
 * Route:
 * - DELETE /api/admin/products/:id
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
