import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

import { AuthService } from '../services/auth.service';
import logger from '../utils/logger';

/**
 * Creates middleware that allows access only to users whose database role
 * appears in the supplied allowedRoles list.
 *
 * Expects:
 * - allowedRoles: Application roles permitted to access the protected route.
 * - req.user.adUsername: Authenticated AD username populated by authMiddleware.
 *
 * Does:
 * - Verifies that authentication middleware has already populated req.user.
 * - Resolves or creates the corresponding application user through AuthService.
 * - Rejects soft-deleted/deactivated users.
 * - Verifies that the user's role is included in allowedRoles.
 * - Attaches the full database user record to req.dbUser so downstream
 *   controllers can access the user's ID, role, and profile information.
 *
 * Sends:
 * - 401 if no authenticated identity is available.
 * - 401 if the resolved application user is deactivated.
 * - 403 if the user is authenticated but does not have an allowed role.
 * - 500 if an unexpected error occurs during authorization.
 *
 * Calls:
 * - next() when authentication and role authorization succeed.
 *
 * Returns:
 * - An Express middleware function configured for the supplied roles.
 */
export const requireRoles = (allowedRoles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.adUsername) {
      return res.status(401).json({
        error: 'Unauthorized: User not authenticated',
      });
    }

    try {
      const authService = new AuthService();

      const dbUser = await authService.getOrCreateUser(req.user.adUsername);

      if (dbUser.isDeleted) {
        return res.status(401).json({
          error: 'Unauthorized: User deactivated',
        });
      }

      if (!allowedRoles.includes(dbUser.role)) {
        logger.warn('RBAC access denied', {
          adUsername: dbUser.adUsername,
          role: dbUser.role,
          allowedRoles,
        });

        return res.status(403).json({
          error: 'Forbidden: Insufficient permissions',
        });
      }

      req.dbUser = dbUser;

      return next();
    } catch (error) {
      logger.error('RBAC middleware error', {
        error,
        adUsername: req.user.adUsername,
      });

      return res.status(500).json({
        error: 'Internal server error during authorization',
      });
    }
  };
};
