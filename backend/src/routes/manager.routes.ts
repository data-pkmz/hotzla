import { Router } from 'express';

import { ManagerApprovalController } from '../controllers/manager-approval.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/:id/manager-approve', requireRoles(['MANAGER']), ManagerApprovalController.approve);

router.post('/:id/manager-reject', requireRoles(['MANAGER']), ManagerApprovalController.reject);

export default router;
