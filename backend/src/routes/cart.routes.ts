import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all cart routes
router.use(authMiddleware);

router.get('/', CartController.getActiveCart);
router.post('/items', CartController.addItem);
router.delete('/items/:id', CartController.removeItem);
router.patch('/items/:id', CartController.updateItem);

export default router;
