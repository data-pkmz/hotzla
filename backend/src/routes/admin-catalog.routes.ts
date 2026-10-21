import { Router } from 'express';

import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllAdminProducts,
  getAdminProductById,
} from '../controllers/catalog.controller';

import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';

const router = Router();

// Only MANAGER can access these routes.
router.use(authMiddleware);
router.use(requireRoles(['MANAGER']));

// GET /api/admin/products
router.get('/', getAllAdminProducts);

// GET /api/admin/products/:id
router.get('/:id', getAdminProductById);

// POST /api/admin/products
router.post('/', createProduct);

// PUT /api/admin/products/:id
router.put('/:id', updateProduct);

// DELETE /api/admin/products/:id
router.delete('/:id', deleteProduct);

export default router;
