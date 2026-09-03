import { NextFunction, Request, Response, Router } from 'express';
import { Role } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { ManagerApprovalController } from '../controllers/manager-approval.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

const authService = new AuthService();

const RBACMiddleware = {
  requireManager: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.adUsername) {
        return res.status(401).json({
          error: 'Unauthorized',
        });
      }

      const user = await authService.getOrCreateUser(req.user.adUsername);

      if (user.role !== Role.MANAGER) {
        return res.status(403).json({
          error: 'Forbidden',
        });
      }

      res.locals.authenticatedUser = user;

      return next();
    } catch (error) {
      return next(error);
    }
  },
};

router.use(authMiddleware);
router.post(
  '/:id/manager-approve',
  RBACMiddleware.requireManager,
  ManagerApprovalController.approve
);

router.post('/:id/manager-reject', RBACMiddleware.requireManager, ManagerApprovalController.reject);

export default router;
