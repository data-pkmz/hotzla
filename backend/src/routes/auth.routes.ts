import { Router } from 'express';
import { getCurrentUser, devSwitchUser } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/auth/me', authMiddleware, getCurrentUser);

router.post('/auth/dev-switch-user', authMiddleware, devSwitchUser);

export default router;
