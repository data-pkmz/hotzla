import { Router } from 'express';
import { createProduct, updateProduct, deleteProduct } from '../controllers/catalog.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';

const router = Router();

// Only MANAGER can access these routes
router.use(authMiddleware);
router.use(requireRoles(['MANAGER']));

// POST /api/admin/products
router.post('/', createProduct);

// PUT /api/admin/products/:id
router.put('/:id', updateProduct);

// DELETE /api/admin/products/:id
router.delete('/:id', deleteProduct);

export default router;
