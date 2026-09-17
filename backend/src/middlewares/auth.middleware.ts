import type { Request, Response, NextFunction } from 'express';

/**
 * Resolves the authenticated user's AD username according to the configured
 * authentication mode and attaches the identity to req.user.
 *
 * Expects:
 * - AUTH_MODE to be configured as either:
 *   - "mock": Uses the X-Mock-User request header.
 *   - "iwa": Uses the X-Remote-User request header populated by the
 *     Windows/IWA authentication layer.
 *
 * Does:
 * - Reads the appropriate authentication header based on AUTH_MODE.
 * - Rejects requests when AUTH_MODE is unsupported.
 * - Rejects requests when no authenticated username is available.
 * - Attaches the authenticated identity to req.user for later middleware
 *   and controllers.
 *
 * Sends:
 * - 500 if AUTH_MODE is missing or unsupported.
 * - 401 if the expected authentication header is missing.
 *
 * Calls:
 * - next() when the request contains a valid authenticated identity.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const mode = process.env.AUTH_MODE;
  let adUsername: string | undefined;

  switch (mode) {
    case 'mock':
      adUsername = req.headers['x-mock-user'] as string;
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
