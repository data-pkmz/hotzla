import { Router } from 'express';
import { createProduct, updateProduct, deleteProduct } from '../controllers/catalog.controller';
import { authMiddleware, requireManagerRole } from '../middlewares/auth.middleware';

const router = Router();

// Protect all admin catalog routes: require authentication + MANAGER role
router.use(authMiddleware);
router.use(requireManagerRole);

// POST /api/admin/products
router.post('/', createProduct);

// PUT /api/admin/products/:id
router.put('/:id', updateProduct);

// DELETE /api/admin/products/:id
router.delete('/:id', deleteProduct);

export default router;
