import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { AuditController } from '../controllers/audit.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';

const router = Router();

// Apply authentication middleware to all order routes
router.use(authMiddleware);

// Audit / History
router.get(
  '/:id/history',
  requireRoles(['REQUESTER', 'MANAGER', 'WORKER']),
  AuditController.getOrderHistory
);

router.post('/checkout', requireRoles(['REQUESTER']), OrderController.checkout);
router.get('/my-orders', requireRoles(['REQUESTER']), OrderController.getMyOrders);
router.get('/:id', requireRoles(['REQUESTER', 'MANAGER', 'WORKER']), OrderController.getOrderById);

export default router;
