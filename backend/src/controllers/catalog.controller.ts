import { Request, Response } from 'express';
import { CatalogService } from '../services/catalog.service';
import logger from '../utils/logger';
import type { ProductType } from 'shared-types';

/**
 * GET /api/products
 * Fetch active products list (supports category filtering)
 */
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;

    let products = await CatalogService.getProducts();

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
    logger.error('Failed to fetch products', { error });
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
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('Failed to fetch product by ID', { error, id: req.params.id });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/admin/products
 * Create a new product (Admin route)
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, category, productType, basePrice } = req.body;

    if (!name || !category || basePrice === undefined) {
      res.status(400).json({
        success: false,
        message: 'Product name, category, and basePrice are required',
      });
      return;
    }

    const createdBy = req.user?.adUsername;

    const newProduct = await CatalogService.createProduct({
      name,
      description: description || '',
      category,
      productType: (productType as ProductType) || 'FIXED',
      basePrice: Number(basePrice),
      createdBy,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct,
    });
  } catch (error) {
    logger.error('Failed to create product', { error, body: req.body });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PUT /api/admin/products/:id
 * Update an existing product (Admin route)
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existingProduct = await CatalogService.getProductById(id);

    if (!existingProduct) {
      res.status(404).json({ success: false, message: 'Product to update was not found' });
      return;
    }

    const updatedProduct = await CatalogService.updateProduct(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    logger.error('Failed to update product', { error, id: req.params.id, body: req.body });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * DELETE /api/admin/products/:id
 * Soft delete a product (set isActive to false, isDeleted to true)
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existingProduct = await CatalogService.getProductById(id);

    if (!existingProduct) {
      res.status(404).json({ success: false, message: 'Product to delete was not found' });
      return;
    }

    await CatalogService.softDeleteProduct(id);

    res.status(200).json({
      success: true,
      message: 'Product removed successfully (Soft Delete)',
    });
  } catch (error) {
    logger.error('Failed to delete product', { error, id: req.params.id });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
