import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import logger from '../utils/logger';

const authService = new AuthService();

/**
 * Returns the currently authenticated application user.
 *
 * Expects:
 * - req.user: Authentication information populated by authMiddleware.
 * - req.user.adUsername: The authenticated user's Active Directory username.
 *
 * Does:
 * - Verifies that authentication information exists on the request.
 * - Calls AuthService.getOrCreateUser using the authenticated AD username.
 * - Creates a database user with the default role if the user does not
 *   already exist.
 *
 * Sends:
 * - 200 with the current database user on success.
 * - 401 when req.user is missing.
 * - 500 when an unexpected error occurs while retrieving or creating the user.
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const user = await authService.getOrCreateUser(req.user.adUsername);

    return res.json(user);
  } catch (error) {
    logger.error('Error occurred while fetching user:', { error });

    return res.status(500).json({
      error: 'Internal Server Error',
    });
  }
}

/**
 * Changes the current user's role while running in mock authentication mode.
 *
 * Expects:
 * - req.user: Authentication information populated by authMiddleware.
 * - req.user.adUsername: The AD username of the mock user being changed.
 * - req.body.role: The new application role to assign to the user.
 * - AUTH_MODE to be set to "mock".
 *
 * Does:
 * - Verifies that authentication information exists on the request.
 * - Prevents the endpoint from being used outside mock authentication mode.
 * - Calls AuthService.switchUserRole to update the current user's role.
 *
 * Sends:
 * - 200 with the updated user on success.
 * - 401 when req.user is missing.
 * - 403 when the application is not running in mock authentication mode.
 * - 500 when an unexpected error occurs while changing the user's role.
 */
export async function devSwitchUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    if (process.env.AUTH_MODE !== 'mock') {
      return res.status(403).json({
        error: 'This endpoint is only available in mock mode.',
      });
    }

    const { role } = req.body;

    const user = await authService.switchUserRole(req.user.adUsername, role);

    return res.json(user);
  } catch (error) {
    logger.error('Error occurred while switching user role:', { error });

    return res.status(500).json({
      error: 'Internal Server Error',
    });
  }
}
