import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all order routes
router.use(authMiddleware);

router.post('/checkout', OrderController.checkout);

export default router;
