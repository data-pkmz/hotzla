import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import logger from '../utils/logger';

/**
 * Role-Based Access Control (RBAC) Middleware
 * Verifies that the authenticated user has one of the allowed roles.
 * Also fetches the full user record and attaches it to `req.dbUser`.
 */
export const requireRoles = (allowedRoles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Verify authentication (authMiddleware should have run first)
    if (!req.user || !req.user.adUsername) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    try {
      // 2. Fetch or auto-provision the user's real profile from the database
      const authService = new AuthService();
      const dbUser = await authService.getOrCreateUser(req.user.adUsername);

      if (dbUser.isDeleted) {
        return res.status(401).json({ error: 'Unauthorized: User deactivated' });
      }

      // 3. Check if the user's role is in the allowed roles list
      if (!allowedRoles.includes(dbUser.role)) {
        logger.warn(
          `RBAC Forbidden: User ${dbUser.adUsername} (Role: ${dbUser.role}) attempted to access a route requiring [${allowedRoles.join(', ')}]`
        );
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      // 4. Attach the full dbUser to the request for the controllers
      req.dbUser = dbUser;

      // 5. Proceed to the next middleware/controller
      return next();
    } catch (error) {
      logger.error('RBAC Middleware Error:', { error });
      return res.status(500).json({ error: 'Internal server error during authorization' });
    }
  };
};
