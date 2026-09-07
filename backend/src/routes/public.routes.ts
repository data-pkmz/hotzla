import { Router } from 'express';
import { PublicApprovalController } from '../controllers/public-approval.controller';

const router = Router();

// GET order details for the public approval page
router.get('/approval-info/:token', PublicApprovalController.getApprovalInfo);

// POST the budget approval decision
router.post('/approve-budget', PublicApprovalController.processApproval);

export default router;
