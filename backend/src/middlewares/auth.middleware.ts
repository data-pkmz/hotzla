import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import logger from '../utils/logger';

const authService = new AuthService();

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const mode = process.env.AUTH_MODE || 'mock';
  let adUsername: string | undefined;

  switch (mode) {
    case 'mock':
      adUsername = (req.headers['x-mock-user'] as string) || 'dev_requester';
      break;

    case 'iwa':
      adUsername = req.headers['x-remote-user'] as string;
      break;

    default:
      return res.status(500).json({
        error: 'Unknown authentication mode',
      });
  }

  if (!adUsername) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  req.user = {
    adUsername,
    authMethod: mode,
  };

  return next();
}

export async function requireManagerRole(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.adUsername) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await authService.getOrCreateUser(req.user.adUsername);

    if (user.role !== 'MANAGER') {
      return res.status(403).json({ success: false, message: 'Forbidden: Manager role required' });
    }

    return next();
  } catch (error) {
    logger.error('Error in requireManagerRole middleware', { error });
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
