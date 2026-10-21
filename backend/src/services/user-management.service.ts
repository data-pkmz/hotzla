import { Role, type Prisma } from '@prisma/client';
import type {
  AssignableUserRole,
  GetRoleManagementUsersResponse,
  RoleManagementUser,
  UpdateUserRoleResponse,
} from 'shared-types';

import { prisma } from '../config/db';
import logger from '../utils/logger';

/**
 * Fields returned by the Role Management API.
 *
 * Do not expose unnecessary user information.
 */
const roleManagementUserSelect = {
  id: true,
  fullName: true,
  adUsername: true,
  militaryEmail: true,
  unit: true,
  role: true,
} satisfies Prisma.UserSelect;

/**
 * Application-level error for role management operations.
 */
export class UserManagementError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'UserManagementError';
  }
}

export class UserManagementService {
  /**
   * Retrieves all active users for the Role Management page.
   *
   * Includes managers so they can be displayed as read-only.
   */
  static async getUsers(): Promise<GetRoleManagementUsersResponse> {
    const users = await prisma.user.findMany({
      where: {
        isDeleted: false,
      },
      select: roleManagementUserSelect,
      orderBy: [{ fullName: 'asc' }, { adUsername: 'asc' }],
    });

    return {
      users: users as RoleManagementUser[],
    };
  }

  /**
   * Updates an active user's role.
   *
   * Permitted transitions:
   * REQUESTER -> WORKER
   * WORKER -> REQUESTER
   *
   * Manager accounts are never modified through this service.
   *
   * @param userId - UUID of the user whose role is being updated.
   * @param newRole - Desired role (REQUESTER or WORKER).
   * @param changedByUserId - UUID of the manager making the change.
   */
  static async updateUserRole(
    userId: string,
    newRole: AssignableUserRole,
    changedByUserId: string
  ): Promise<UpdateUserRoleResponse> {
    // Runtime validation is required even though TypeScript
    // restricts AssignableUserRole.
    if (newRole !== 'REQUESTER' && newRole !== 'WORKER') {
      throw new UserManagementError('ניתן להקצות רק תפקיד מבקש או עובד', 400);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(userId)) {
      throw new UserManagementError('מזהה משתמש לא תקין', 400);
    }

    if (!uuidRegex.test(changedByUserId)) {
      throw new UserManagementError('מזהה מנהל לא תקין', 400);
    }

    const user = await prisma.$transaction(async (tx) => {
      // Verify that the acting user is currently an active manager.
      const manager = await tx.user.findFirst({
        where: {
          id: changedByUserId,
          role: Role.MANAGER,
          isDeleted: false,
        },
        select: { id: true },
      });

      if (!manager) {
        throw new UserManagementError('אין הרשאה לניהול תפקידי משתמשים', 403);
      }

      // Conditional update prevents changes to manager or deleted
      // accounts even if another request changes their state.
      const result = await tx.user.updateMany({
        where: {
          id: userId,
          isDeleted: false,
          role: {
            in: [Role.REQUESTER, Role.WORKER],
          },
        },
        data: {
          role: newRole,
        },
      });

      if (result.count === 0) {
        const existingUser = await tx.user.findUnique({
          where: { id: userId },
          select: {
            role: true,
            isDeleted: true,
          },
        });

        if (!existingUser || existingUser.isDeleted) {
          throw new UserManagementError('המשתמש לא נמצא', 404);
        }

        if (existingUser.role === Role.MANAGER) {
          throw new UserManagementError('לא ניתן לשנות הרשאות של מנהל דרך המערכת', 403);
        }

        throw new UserManagementError('לא ניתן לעדכן את תפקיד המשתמש', 409);
      }

      const updatedUser = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: roleManagementUserSelect,
      });

      return updatedUser;
    });

    logger.info('User role updated', {
      userId,
      newRole,
      changedByUserId,
    });

    return {
      user: user as RoleManagementUser,
    };
  }
}
