import type { Request, Response, NextFunction } from 'express';
import type {
  AssignableUserRole,
  GetRoleManagementUsersResponse,
  UpdateUserRoleResponse,
} from 'shared-types';

import { UserManagementService, UserManagementError } from '../services/user-management.service';

/**
 * Controller for manager-only user role management.
 *
 * Authentication and role-based authorization must be enforced
 * by middleware on the corresponding routes.
 */
export class UserManagementController {
  /**
   * GET /api/admin/users
   *
   * Returns all non-deleted users, including managers.
   * Manager accounts are read-only in the role management UI.
   */
  static async getUsers(
    _req: Request,
    res: Response<GetRoleManagementUsersResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await UserManagementService.getUsers();

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/users/:id/role
   *
   * Updates a user's role between REQUESTER and WORKER.
   * The MANAGER role cannot be assigned or removed.
   */
  static async updateUserRole(
    req: Request,
    res: Response<UpdateUserRoleResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.params.id;
      const { role } = req.body ?? {};

      // Validate the requested role at runtime.
      if (role !== 'REQUESTER' && role !== 'WORKER') {
        throw new UserManagementError('תפקיד לא תקין. ניתן לבחור רק מבקש או עובד', 400);
      }

      // The authenticated database user must be present.
      // Never accept the acting manager's identity from req.body.
      const changedByUserId = req.dbUser?.id;

      if (!changedByUserId) {
        throw new UserManagementError('נדרש אימות משתמש', 401);
      }

      const result = await UserManagementService.updateUserRole(
        userId,
        role as AssignableUserRole,
        changedByUserId
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
