import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';

const router = Router();

router.post('/checkout', OrderController.checkout);

export default router;
