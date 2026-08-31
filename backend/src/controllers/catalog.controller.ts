import { Request, Response } from 'express';
import { CatalogService } from '../services/catalog.service';
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
} from '../validations/catalog.validation';

/**
 * GET /api/products
 * Fetch active products list (supports category filtering)
 */
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;

    // Filter active products only
    let products = await CatalogService.getProducts();

    // Filter by category if query parameter is provided
    if (category) {
      products = products.filter(
        (product) => product.category.toLowerCase() === String(category).toLowerCase()
      );
    }

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/products/:id
 * Fetch single product details by ID
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await CatalogService.getProductById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    const attributeDefinitions = await CatalogService.getAttributeDefinitions(id);

    const attributes = attributeDefinitions.map((attribute) => ({
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
        ...product,
        basePrice: product.basePrice.toNumber(),
        attributes,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * POST /api/admin/products
 * Create a new product (Admin route)
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
    console.error(error);

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create product',
    });
  }
};

/**
 * PUT /api/admin/products/:id
 * Update an existing product (Admin route)
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
    console.error(error);

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update product',
    });
  }
};

/**
 * DELETE /api/admin/products/:id
 * Soft delete a product (set isActive to false)
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
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Product to delete was not found' });
      return;
    }
    console.error(error);

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete product',
    });
  }
};
