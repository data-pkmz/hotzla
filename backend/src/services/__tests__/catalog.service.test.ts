import { CatalogService } from '../catalog.service';
import { prisma } from '../../config/db';
import { Prisma, ProductType } from '@prisma/client';
import type { Product, ProductAttributeDefinition } from '@prisma/client';

const products: Product[] = [
  {
    id: 'product-1',
    name: 'כרטיסי ביקור',
    description: 'כרטיסי ביקור מקצועיים',
    category: 'הדפסה',
    imageUrl: '/images/test-product.jpg',
    productType: ProductType.FIXED,
    basePrice: new Prisma.Decimal(50),
    isActive: true,
    createdBy: null,
    createdAt: new Date(),
    isDeleted: false,
  },
];

const attribute: ProductAttributeDefinition = {
  id: 'attribute-1',
  productId: 'product-1',
  attributeName: 'Paper Type',
  attributeType: 'SELECT',
  isRequired: true,
  displayOrder: 1,
  pricingRule: 'NONE',
  unitPrice: new Prisma.Decimal(0),
  minValue: null,
  maxValue: null,
  isDeleted: false,
};

jest.mock('../../config/db', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    productAttributeDefinition: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('CatalogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   *Tests for getProducts.
   */

  describe('getProducts', () => {
    it('returns active and non-deleted products ordered by name', async () => {
      jest.mocked(prisma.product.findMany).mockResolvedValue(products);

      const result = await CatalogService.getProducts();

      expect(result).toEqual(products);

      expect(jest.mocked(prisma.product.findMany)).toHaveBeenCalledWith({
        where: {
          isDeleted: false,
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
    });

    it('returns an empty array when there are no active products', async () => {
      jest.mocked(prisma.product.findMany).mockResolvedValue([]);

      const result = await CatalogService.getProducts();

      expect(result).toEqual([]);

      expect(jest.mocked(prisma.product.findMany)).toHaveBeenCalledTimes(1);
    });

    it('propagates Prisma errors', async () => {
      const error = new Error('שגיאת מסד נתונים');

      jest.mocked(prisma.product.findMany).mockRejectedValue(error);

      await expect(CatalogService.getProducts()).rejects.toThrow('שגיאת מסד נתונים');
    });
  });
});

/**
 *Tests for getProductById.
 */

describe('getProductById', () => {
  it('returns an active and non-deleted product', async () => {
    const product = products[0];

    jest.mocked(prisma.product.findFirst).mockResolvedValue(product);

    const result = await CatalogService.getProductById('product-1');

    expect(result).toEqual(product);

    expect(jest.mocked(prisma.product.findFirst)).toHaveBeenCalledWith({
      where: {
        id: 'product-1',
        isDeleted: false,
        isActive: true,
      },
    });
  });

  it('returns null when the product does not exist', async () => {
    jest.mocked(prisma.product.findFirst).mockResolvedValue(null);

    const result = await CatalogService.getProductById('does-not-exist');

    expect(result).toBeNull();
  });

  it('propagates Prisma errors', async () => {
    jest.mocked(prisma.product.findFirst).mockRejectedValue(new Error('שגיאת מסד נתונים'));

    await expect(CatalogService.getProductById('product-1')).rejects.toThrow('שגיאת מסד נתונים');
  });

  /**
   *Tests for createProduct.
   */

  describe('createProduct', () => {
    it('creates a product with the correct data', async () => {
      const input = {
        name: 'Business Cards',
        description: 'Professional business cards',
        category: 'Printing',
        productType: 'FIXED' as const,
        basePrice: 50,
        createdBy: 'user-1',
      };

      const createdProduct = products[0];

      jest.mocked(prisma.product.create).mockResolvedValue(createdProduct);

      const result = await CatalogService.createProduct(input);

      expect(result).toEqual(createdProduct);

      expect(jest.mocked(prisma.product.create)).toHaveBeenCalledWith({
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          productType: input.productType,
          basePrice: input.basePrice,
          isActive: true,
          createdBy: input.createdBy,
        },
      });
    });

    it('creates a product without createdBy', async () => {
      const input = {
        name: 'Notebook',
        description: 'Branded notebook',
        category: 'Stationery',
        productType: 'DYNAMIC' as const,
        basePrice: 25,
      };

      jest.mocked(prisma.product.create).mockResolvedValue(products[0]);

      await CatalogService.createProduct(input);

      expect(jest.mocked(prisma.product.create)).toHaveBeenCalledWith({
        data: {
          name: input.name,
          description: input.description,
          category: input.category,
          productType: input.productType,
          basePrice: input.basePrice,
          isActive: true,
          createdBy: undefined,
        },
      });
    });

    it('propagates Prisma errors', async () => {
      jest.mocked(prisma.product.create).mockRejectedValue(new Error('שגיאת מסד נתונים'));

      await expect(
        CatalogService.createProduct({
          name: 'Notebook',
          description: 'Notebook',
          category: 'Stationery',
          productType: 'FIXED',
          basePrice: 20,
        })
      ).rejects.toThrow('שגיאת מסד נתונים');
    });
  });

  /**
   *Tests for updateProduct.
   */

  describe('updateProduct', () => {
    it('updates the supplied product fields', async () => {
      const data = {
        name: 'Updated Business Cards',
        basePrice: 75,
      };

      const updatedProduct = products[0];

      jest.mocked(prisma.product.update).mockResolvedValue(updatedProduct);

      const result = await CatalogService.updateProduct('product-1', data);

      expect(result).toEqual(updatedProduct);

      expect(jest.mocked(prisma.product.update)).toHaveBeenCalledWith({
        where: {
          id: 'product-1',
        },
        data,
      });
    });

    it('allows updating the product type', async () => {
      const data = {
        productType: 'DYNAMIC' as const,
      };

      jest.mocked(prisma.product.update).mockResolvedValue(products[0]);

      await CatalogService.updateProduct('product-1', data);

      expect(jest.mocked(prisma.product.update)).toHaveBeenCalledWith({
        where: {
          id: 'product-1',
        },
        data,
      });
    });

    it('propagates Prisma errors', async () => {
      jest.mocked(prisma.product.update).mockRejectedValue(new Error('המוצר לא נמצא'));

      await expect(
        CatalogService.updateProduct('product-1', {
          name: 'Updated',
        })
      ).rejects.toThrow('המוצר לא נמצא');
    });
  });

  /**
   *Tests for softDeleteProduct.
   */

  describe('softDeleteProduct', () => {
    it('marks the product as deleted and inactive', async () => {
      jest.mocked(prisma.product.update).mockResolvedValue(products[0]);

      await CatalogService.softDeleteProduct('product-1');

      expect(jest.mocked(prisma.product.update)).toHaveBeenCalledWith({
        where: {
          id: 'product-1',
        },
        data: {
          isDeleted: true,
          isActive: false,
        },
      });
    });

    it('propagates Prisma errors', async () => {
      jest.mocked(prisma.product.update).mockRejectedValue(new Error('המוצר לא נמצא'));

      await expect(CatalogService.softDeleteProduct('product-1')).rejects.toThrow('המוצר לא נמצא');
    });
  });

  /**
   *Tests for activateProduct.
   */

  describe('activateProduct', () => {
    it('activates a product that has not been deleted', async () => {
      jest.mocked(prisma.product.update).mockResolvedValue(products[0]);

      await CatalogService.activateProduct('product-1');

      expect(jest.mocked(prisma.product.update)).toHaveBeenCalledWith({
        where: {
          id: 'product-1',
          isDeleted: false,
        },
        data: {
          isActive: true,
        },
      });
    });

    it('does not activate a deleted product', async () => {
      jest.mocked(prisma.product.update).mockRejectedValue(new Error('הרשומה לא נמצאה'));

      await expect(CatalogService.activateProduct('deleted-product')).rejects.toThrow(
        'הרשומה לא נמצאה'
      );

      expect(jest.mocked(prisma.product.update)).toHaveBeenCalledWith({
        where: {
          id: 'deleted-product',
          isDeleted: false,
        },
        data: {
          isActive: true,
        },
      });
    });
  });

  /**
   *Tests for deactivateProduct.
   */

  describe('deactivateProduct', () => {
    it('deactivates a product without deleting it', async () => {
      jest.mocked(prisma.product.update).mockResolvedValue(products[0]);

      await CatalogService.deactivateProduct('product-1');

      expect(jest.mocked(prisma.product.update)).toHaveBeenCalledWith({
        where: {
          id: 'product-1',
          isDeleted: false,
        },
        data: {
          isActive: false,
        },
      });
    });

    it('does not deactivate a deleted product', async () => {
      jest.mocked(prisma.product.update).mockRejectedValue(new Error('הרשומה לא נמצאה'));

      await expect(CatalogService.deactivateProduct('deleted-product')).rejects.toThrow(
        'הרשומה לא נמצאה'
      );
    });
  });

  /**
   *Tests for createAttribute.
   */

  describe('createAttribute', () => {
    it('creates an attribute definition for a product', async () => {
      const data = {
        attributeName: 'Paper Type',
        attributeType: 'SELECT' as const,
        isRequired: true,
        displayOrder: 1,
        pricingRule: 'NONE' as const,
        unitPrice: 0,
        minValue: undefined,
        maxValue: undefined,
      };

      jest.mocked(prisma.productAttributeDefinition.create).mockResolvedValue(attribute);
      const result = await CatalogService.createAttribute('product-1', data);

      expect(result).toEqual(attribute);

      expect(jest.mocked(prisma.productAttributeDefinition.create)).toHaveBeenCalledWith({
        data: {
          productId: 'product-1',
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
    });

    it('propagates Prisma errors', async () => {
      jest
        .mocked(prisma.productAttributeDefinition.create)
        .mockRejectedValue(new Error('המוצר לא נמצא'));

      await expect(
        CatalogService.createAttribute('product-1', {
          attributeName: 'Size',
          attributeType: 'NUMBER',
          isRequired: false,
          displayOrder: 1,
          pricingRule: 'NONE',
        })
      ).rejects.toThrow('המוצר לא נמצא');
    });
  });

  /**
   *Tests for updateAttribute.
   */

  describe('updateAttribute', () => {
    it('updates the supplied attribute fields', async () => {
      const data = {
        attributeName: 'Updated Paper Type',
        isRequired: false,
      };

      jest.mocked(prisma.productAttributeDefinition.update).mockResolvedValue(attribute);

      await CatalogService.updateAttribute('attribute-1', data);

      expect(jest.mocked(prisma.productAttributeDefinition.update)).toHaveBeenCalledWith({
        where: {
          id: 'attribute-1',
        },
        data,
      });
    });

    it('propagates Prisma errors', async () => {
      jest
        .mocked(prisma.productAttributeDefinition.update)
        .mockRejectedValue(new Error('המאפיין לא נמצא'));

      await expect(
        CatalogService.updateAttribute('attribute-1', {
          attributeName: 'Updated',
        })
      ).rejects.toThrow('המאפיין לא נמצא');
    });
  });

  /**
   *Tests for softDeleteAttribute.
   */

  describe('softDeleteAttribute', () => {
    it('marks the attribute as deleted', async () => {
      jest.mocked(prisma.productAttributeDefinition.update).mockResolvedValue(attribute);
      await CatalogService.softDeleteAttribute('attribute-1');

      expect(jest.mocked(prisma.productAttributeDefinition.update)).toHaveBeenCalledWith({
        where: {
          id: 'attribute-1',
        },
        data: {
          isDeleted: true,
        },
      });
    });

    it('propagates Prisma errors', async () => {
      jest
        .mocked(prisma.productAttributeDefinition.update)
        .mockRejectedValue(new Error('המאפיין לא נמצא'));

      await expect(CatalogService.softDeleteAttribute('attribute-1')).rejects.toThrow(
        'המאפיין לא נמצא'
      );
    });
  });
});
