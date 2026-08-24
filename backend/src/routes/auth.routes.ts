import { Router } from 'express';
import { getCurrentUser, devSwitchUser } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, getCurrentUser);

router.post('/dev-switch-user', authMiddleware, devSwitchUser);

export default router;
