import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';

const router = Router();

router.get('/', CartController.getActiveCart);
router.post('/items', CartController.addItem);
router.delete('/items/:id', CartController.removeItem);

export default router;
