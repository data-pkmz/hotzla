import { Request, Response } from 'express';
import { CatalogService } from '../services/catalog.service';

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
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/admin/products
 * Create a new product (Admin route)
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, description = '', basePrice = 0, productType = 'DYNAMIC', isActive = true, definitions = [] } = req.body;

    if (!name || !category) {
      res.status(400).json({ success: false, message: 'Product name and category are required' });
      return;
    }

    const newProduct = await CatalogService.createProductWithDefinitions({ name, category, description, basePrice, productType, isActive, definitions });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct,
    });
  } catch (error) {
    console.error(error);
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
    const { name, category, description = '', basePrice = 0, productType = 'DYNAMIC', isActive = true, definitions = [] } = req.body;
    const updatedProduct = await CatalogService.updateProductWithDefinitions(id, { name, category, description, basePrice, productType, isActive, definitions });

    if (!updatedProduct) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * DELETE /api/admin/products/:id
 * Soft delete a product (set isActive to false)
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await CatalogService.softDeleteProduct(id);

    if (!product) {
      res.status(404).json({ success: false, message: 'Product to delete was not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Product removed successfully (Soft Delete)',
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Product to delete was not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
