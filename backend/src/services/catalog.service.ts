import { prisma } from '../config/db.js';
import type { Product, ProductAttributeDefinition } from '@prisma/client';

export class CatalogService {
  /**
   * Returns all products that are available in the catalogue.
   *
   * Deleted products and inactive products are excluded.
   */
  public static async getProducts(): Promise<Product[]> {
    return prisma.product.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Returns a single active product by ID.
   *
   * Deleted and inactive products are not returned.
   */
  public static async getProductById(id: string): Promise<Product | null> {
    return prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
        isActive: true,
      },
    });
  }

  /**
   * Creates a new product.
   */
  public static async createProduct(data: {
    name: string;
    description: string;
    category: string;
    productType: 'FIXED' | 'DYNAMIC';
    basePrice: number;
    createdBy?: string;
  }): Promise<Product> {
    return prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        productType: data.productType,
        basePrice: data.basePrice,
        isActive: true,
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Updates an existing product.
   */
  public static async updateProduct(
    id: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
      productType?: 'FIXED' | 'DYNAMIC';
      basePrice?: number;
    }
  ): Promise<Product> {
    return prisma.product.update({
      where: {
        id,
      },
      data,
    });
  }

  /**
   * Soft-deletes a product.
   *
   * The database record is preserved so existing orders can
   * continue to reference the product.
   */
  public static async softDeleteProduct(id: string): Promise<Product> {
    return prisma.product.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
        isActive: false,
      },
    });
  }

  /**
   * Activates a product.
   *
   * This does not restore a soft-deleted product.
   */
  public static async activateProduct(id: string): Promise<Product> {
    return prisma.product.update({
      where: {
        id,
        isDeleted: false,
      },
      data: {
        isActive: true,
      },
    });
  }

  /**
   * Deactivates a product without deleting it.
   */
  public static async deactivateProduct(id: string): Promise<Product> {
    return prisma.product.update({
      where: {
        id,
        isDeleted: false,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Adds an attribute definition to a product.
   */
  public static async createAttribute(
    productId: string,
    data: {
      attributeName: string;
      attributeType: 'SELECT' | 'NUMBER' | 'BOOLEAN' | 'TEXT' | 'FILE_UPLOAD';
      isRequired: boolean;
      displayOrder: number;
      pricingRule: 'NONE' | 'PER_UNIT_MULTIPLIER' | 'FLAT_ADD_PER_OPTION';
      unitPrice?: number;
      minValue?: number;
      maxValue?: number;
    }
  ): Promise<ProductAttributeDefinition> {
    return prisma.productAttributeDefinition.create({
      data: {
        productId,
        attributeName: data.attributeName,
        attributeType: data.attributeType,
        isRequired: data.isRequired,
        displayOrder: data.displayOrder,
        pricingRule: data.pricingRule,
        unitPrice: data.unitPrice,
        minValue: data.minValue,
        maxValue: data.maxValue,
      },
    });
  }

  /**
   * Updates an attribute definition.
   */
  public static async updateAttribute(
    id: string,
    data: {
      attributeName?: string;
      attributeType?: 'SELECT' | 'NUMBER' | 'BOOLEAN' | 'TEXT' | 'FILE_UPLOAD';
      isRequired?: boolean;
      displayOrder?: number;
      pricingRule?: 'NONE' | 'PER_UNIT_MULTIPLIER' | 'FLAT_ADD_PER_OPTION';
      unitPrice?: number;
      minValue?: number;
      maxValue?: number;
    }
  ): Promise<ProductAttributeDefinition> {
    return prisma.productAttributeDefinition.update({
      where: {
        id,
      },
      data,
    });
  }

  /**
   * Soft-deletes an attribute definition.
   */
  public static async softDeleteAttribute(id: string): Promise<ProductAttributeDefinition> {
    return prisma.productAttributeDefinition.update({
      where: {
        id,
      },
      data: {
        isDeleted: true,
      },
    });
  }
}

export default CatalogService;
