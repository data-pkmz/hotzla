import request from 'supertest';

jest.mock('../../config/db', () => ({
  prisma: {},
  testDbConnection: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/catalog.service', () => ({
  CatalogService: {
    getProducts: jest.fn(),
    getProductById: jest.fn(),
    createProductWithDefinitions: jest.fn(),
    updateProductWithDefinitions: jest.fn(),
    softDeleteProduct: jest.fn(),
  },
}));

import app from '../../app';
import { CatalogService } from '../../services/catalog.service';

const mockProducts = [
  { id: '1', name: 'חוברת כרוכה A4', category: 'booklets', isActive: true },
  { id: '2', name: 'פוסטר 70x100', category: 'posters', isActive: true },
];
let deletedProductId: string | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  deletedProductId = null;
  jest.mocked(CatalogService.getProducts).mockResolvedValue(mockProducts as never);
  jest.mocked(CatalogService.getProductById).mockImplementation(async (id: string) => deletedProductId === id ? undefined as never : mockProducts.find((product) => product.id === id) as never);
  jest.mocked(CatalogService.createProductWithDefinitions).mockImplementation(async (data) => ({ id: '4', ...data, isActive: true }) as never);
  jest.mocked(CatalogService.updateProductWithDefinitions).mockImplementation((async (id: string, data: Parameters<typeof CatalogService.updateProductWithDefinitions>[1]) => id === '9999' ? undefined : ({ id, ...data, isActive: true })) as never);
  jest.mocked(CatalogService.softDeleteProduct).mockImplementation(async (id: string) => { if (id !== '2') return undefined as never; deletedProductId = id; return { ...mockProducts[1], isActive: false } as never; });
});

describe('Catalog Routes - Integration Tests', () => {

  // 1. Test fetching all active products (GET)
  describe('GET /api/products', () => {
    it('should return a list of active products', async () => {
      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Verify that product 3 (which has isActive: false) is not included in the response
      const hasInactiveProduct = res.body.data.some((p: any) => p.id === '3');
      expect(hasInactiveProduct).toBe(false);
    });

    it('should filter products by category', async () => {
      const res = await request(app).get('/api/products?category=posters');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every((p: any) => p.category === 'posters')).toBe(true);
    });
  });

  // 2. Test fetching a single product by ID (GET)
  describe('GET /api/products/:id', () => {
    it('should return product details for a valid active product ID', async () => {
      const res = await request(app).get('/api/products/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id', '1');
      expect(res.body.data.name).toBe('חוברת כרוכה A4');
    });

    it('should return 404 if product does not exist', async () => {
      const res = await request(app).get('/api/products/non-existing-id');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Product not found');
    });

    it('should return 404 for an inactive (soft-deleted) product', async () => {
      const res = await request(app).get('/api/products/3'); // ID 3 has isActive: false

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // 3. Test creating a new product (POST)
  describe('POST /api/admin/products', () => {
    it('should create a new product successfully with valid body', async () => {
      const newProductPayload = {
        name: 'כרטיס ביקור 9x5',
        category: 'cards',
        attributes: { finish: 'matte' },
      };

      const res = await request(app)
        .post('/api/admin/products')
        .send(newProductPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe(newProductPayload.name);
      expect(res.body.data.isActive).toBe(true);
    });

    it('should return 400 Bad Request if required fields (name/category) are missing', async () => {
      const invalidPayload = {
        attributes: { finish: 'matte' },
        // name and category are intentionally omitted
      };

      const res = await request(app)
        .post('/api/admin/products')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Product name and category are required');
    });
  });

  // 4. Test updating an existing product (PUT)
  describe('PUT /api/admin/products/:id', () => {
    it('should update an existing product', async () => {
      const updateData = { name: 'חוברת כרוכה A4 - מעודכן' };

      const res = await request(app)
        .put('/api/admin/products/1')
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updateData.name);
    });

    it('should return 404 when trying to update a non-existing product', async () => {
      const res = await request(app)
        .put('/api/admin/products/9999')
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // 5. Test soft deleting a product (DELETE)
  describe('DELETE /api/admin/products/:id', () => {
    it('should soft delete an existing product', async () => {
      const res = await request(app).delete('/api/admin/products/2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Soft Delete');

      // Verify that the product is now inactive (returns 404 on GET request)
      const getRes = await request(app).get('/api/products/2');
      expect(getRes.status).toBe(404);
    });
  });

});