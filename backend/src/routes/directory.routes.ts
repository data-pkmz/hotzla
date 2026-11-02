import { Router } from 'express';
import { Role } from '@prisma/client';
import { DirectoryController } from '../controllers/directory.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';

const router = Router();

// Protect directory routes with auth and RBAC
router.use(authMiddleware);
router.use(requireRoles([Role.REQUESTER, Role.MANAGER, Role.WORKER]));

router.get('/contacts', DirectoryController.searchContacts);

export default router;
