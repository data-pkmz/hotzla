import { Request, Response } from 'express';
import { CatalogService } from '../services/catalog.service';

// Demo product interface (to be replaced by Prisma/ORM later)
interface Product {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  attributes?: Record<string, unknown>;
}

// Temporary mock data for testing
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'חוברת כרוכה A4',
    category: 'booklets',
    isActive: true,
    attributes: { paperWeight: '135g' },
  },
  {
    id: '2',
    name: 'פוסטר 70x100',
    category: 'posters',
    isActive: true,
    attributes: { finish: 'glossy' },
  },
  { id: '3', name: 'מוצר ישן שנמחק', category: 'posters', isActive: false },
];

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
    const { name, category, description = '', basePrice = 0, productType = 'DYNAMIC', definitions = [] } = req.body;

    if (!name || !category) {
      res.status(400).json({ success: false, message: 'Product name and category are required' });
      return;
    }

    const newProduct = await CatalogService.createProductWithDefinitions({ name, category, description, basePrice, productType, definitions });

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
    const { name, category, description = '', basePrice = 0, productType = 'DYNAMIC', definitions = [] } = req.body;
    const updatedProduct = await CatalogService.updateProductWithDefinitions(id, { name, category, description, basePrice, productType, definitions });

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
    const product = mockProducts.find((p) => p.id === id && p.isActive);

    if (!product) {
      res.status(404).json({ success: false, message: 'Product to delete was not found' });
      return;
    }

    // Perform soft delete
    product.isActive = false;

    res.status(200).json({
      success: true,
      message: 'Product removed successfully (Soft Delete)',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
