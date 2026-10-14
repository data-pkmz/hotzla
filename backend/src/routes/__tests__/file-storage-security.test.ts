import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/db';
import { FileStorageService } from '../../services/file-storage.service';
import { Role } from '@prisma/client';

describe('File Storage Security & Access Control', () => {
  const userAId = '11111111-1111-1111-1111-111111111111';
  const userBId = '22222222-2222-2222-2222-222222222222';
  const workerUserId = '33333333-3333-3333-3333-333333333333';

  const userAFile = `2026/10/14/${userAId}/document-a.pdf`;

  beforeAll(() => {
    process.env.AUTH_MODE = 'mock';
  });

  beforeEach(async () => {
    // Clean up test data specifically for test users
    await prisma.cartItem.deleteMany({
      where: {
        cart: {
          userId: { in: [userAId, userBId] },
        },
      },
    });
    await prisma.cart.deleteMany({
      where: {
        userId: { in: [userAId, userBId] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [userAId, userBId, workerUserId] },
      },
    });

    // Seed test users
    await prisma.user.create({
      data: {
        id: userAId,
        adUsername: 'userA',
        fullName: 'User A',
        role: Role.REQUESTER,
      },
    });

    await prisma.user.create({
      data: {
        id: userBId,
        adUsername: 'userB',
        fullName: 'User B',
        role: Role.REQUESTER,
      },
    });

    await prisma.user.create({
      data: {
        id: workerUserId,
        adUsername: 'workerUser',
        fullName: 'Worker User',
        role: Role.WORKER,
      },
    });
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany({
      where: {
        cart: {
          userId: { in: [userAId, userBId] },
        },
      },
    });
    await prisma.cart.deleteMany({
      where: {
        userId: { in: [userAId, userBId] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [userAId, userBId, workerUserId] },
      },
    });
  });

  describe('Path Traversal Protection', () => {
    it.each([
      '../../etc/passwd',
      '..\\..\\windows\\system32',
      '../uploads/secret.txt',
      'folder/../../escaped.pdf',
      '/etc/passwd',
      'C:\\Windows\\win.ini',
      '2026/10/14/\0evil.pdf',
    ])('rejects malicious path traversal attempt: %s', async (maliciousPath) => {
      const response = await request(app)
        .get('/api/files/download')
        .query({ path: maliciousPath })
        .set('X-Mock-User', 'userA');

      expect([400, 403]).toContain(response.status);
    });
  });

  describe('Ownership Separation & Access Control', () => {
    it('prevents User B from downloading User A uploaded file', async () => {
      // Mock getSecureAbsolutePath to return a fake safe path
      jest.spyOn(FileStorageService, 'getSecureAbsolutePath').mockReturnValue('/tmp/safe.pdf');

      const response = await request(app)
        .get('/api/files/download')
        .query({ path: userAFile })
        .set('X-Mock-User', 'userB');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'Forbidden: You do not have permission to access this file',
      });
    });

    it('allows User A to download their own uploaded file', async () => {
      // Mock FileController.sendFile behavior by intercepting getSecureAbsolutePath
      // Here we verify that authorization passes (doesn't return 401 or 403)
      const response = await request(app)
        .get('/api/files/download')
        .query({ path: userAFile })
        .set('X-Mock-User', 'userA');

      // Authorization passed -> reaches sendFile (returns 404 since file doesn't exist on physical disk)
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'File not found on disk',
      });
    });

    it('allows Workers to download any file for production', async () => {
      const response = await request(app)
        .get('/api/files/download')
        .query({ path: userAFile })
        .set('X-Mock-User', 'workerUser');

      // Authorization passed -> reaches sendFile (returns 404 since file doesn't exist on physical disk)
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'File not found on disk',
      });
    });
  });

  describe('Soft Delete File Access', () => {
    it('rejects download when cart item was soft-deleted', async () => {
      // Create a cart and a soft-deleted cart item for User A
      const cart = await prisma.cart.create({
        data: {
          userId: userAId,
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });

      // Find or create a dummy product for the item
      let product = await prisma.product.findFirst();
      if (!product) {
        product = await prisma.product.create({
          data: {
            name: 'Test Product',
            description: 'Test',
            category: 'Print',
            productType: 'FIXED',
            basePrice: 10,
            isActive: true,
          },
        });
      }

      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: 1,
          computedPrice: 10,
          selectedAttributes: {},
          uploadedFilePath: userAFile,
          isDeleted: true, // SOFT DELETED
        },
      });

      const response = await request(app)
        .get('/api/files/download')
        .query({ path: userAFile })
        .set('X-Mock-User', 'userA');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'Forbidden: File has been deleted or is no longer accessible',
      });
    });
  });

  describe('Product Catalog Image Isolation', () => {
    it('rejects downloading a private requester file via product-image endpoint', async () => {
      const response = await request(app)
        .get('/api/files/product-image')
        .query({ path: userAFile })
        .set('X-Mock-User', 'userA');

      // PDF is rejected either as invalid product image type (400) or not found (404)
      expect([400, 404]).toContain(response.status);
    });

    it('rejects non-image extensions on product-image endpoint', async () => {
      const response = await request(app)
        .get('/api/files/product-image')
        .query({ path: '2026/10/14/catalog.pdf' })
        .set('X-Mock-User', 'userA');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid product image type',
      });
    });
  });
});
