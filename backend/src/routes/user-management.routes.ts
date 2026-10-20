import { Router } from 'express';

import { UserManagementController } from '../controllers/user-management.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';

const router = Router();

/**
 * All user management routes require authentication
 * and the MANAGER role.
 *
 * Neither REQUESTER nor WORKER users can access these endpoints.
 */
router.use(authMiddleware);
router.use(requireRoles(['MANAGER']));

/**
 * GET /api/admin/users
 *
 * Returns all active (non-deleted) users.
 * Includes managers, but their roles cannot be modified.
 */
router.get('/', UserManagementController.getUsers);

/**
 * PATCH /api/admin/users/:id/role
 *
 * Allows managers to change:
 * REQUESTER -> WORKER
 * WORKER -> REQUESTER
 *
 * Does not allow assigning or modifying the MANAGER role.
 */
router.patch('/:id/role', UserManagementController.updateUserRole);

export default router;
