import { Router } from 'express';
import { WorkerOrderController } from '../controllers/worker-order.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';

const router = Router();

// Secure all worker routes
router.use(authMiddleware);
router.use(requireRoles(['MANAGER', 'WORKER']));

router.post('/:id/start-printing', WorkerOrderController.startPrinting);
router.post('/:id/ready-for-pickup', WorkerOrderController.readyForPickup);
router.post('/:id/complete', WorkerOrderController.completeOrder);

export default router;
