import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';

const router = Router();

// Apply authentication and RBAC middleware to all cart routes
router.use(authMiddleware);
router.use(requireRoles(['REQUESTER', 'MANAGER', 'WORKER']));

router.get('/', CartController.getActiveCart);
router.post('/items', CartController.addItem);
router.delete('/items', CartController.clearCart);
router.delete('/items/:id', CartController.removeItem);
router.patch('/items/:id', CartController.updateItem);

export default router;
