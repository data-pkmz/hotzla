import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { AuditController } from '../controllers/audit.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all order routes
router.use(authMiddleware);

// Audit / History
router.get('/:id/history', AuditController.getOrderHistory);

router.post('/checkout', OrderController.checkout);
router.get('/my-orders', OrderController.getMyOrders);
router.get('/:id', OrderController.getOrderById);

export default router;
