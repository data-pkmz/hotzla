import { Router } from 'express';
import { getProducts, getProductById } from '../controllers/catalog.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';

const router = Router();

// Apply authentication and RBAC
router.use(authMiddleware);
router.use(requireRoles(['REQUESTER', 'MANAGER', 'WORKER']));

// GET /api/products
router.get('/', getProducts);

// GET /api/products/:id
router.get('/:id', getProductById);

export default router;
