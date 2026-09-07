import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { AuditController } from '../controllers/audit.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';

const router = Router();

// Apply authentication and RBAC middleware to all order routes
router.use(authMiddleware);
router.use(requireRoles(['REQUESTER', 'MANAGER', 'WORKER']));

// Audit / History
router.get('/:id/history', AuditController.getOrderHistory);

router.post('/checkout', OrderController.checkout);
router.get('/my-orders', OrderController.getMyOrders);
router.get('/:id', OrderController.getOrderById);

export default router;
