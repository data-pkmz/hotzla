import { Router } from 'express';
import { FileController } from '../controllers/file.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validateFileUpload } from '../middlewares/file-validation.middleware';

const router = Router();

const rbacMiddleware = requireRoles(['REQUESTER', 'MANAGER', 'WORKER']);

/**
 * POST /api/files/upload
 * 1. authMiddleware: Checks if user is authenticated via Windows IWA.
 * 2. rbacMiddleware: Checks if user has allowed roles.
 * 3. validateFileUpload: Multer intercepts the binary chunks and creates req.file.
 * 4. FileController.uploadFile: Saves the file to disk and returns the DB path.
 */
router.post(
  '/upload',
  authMiddleware,
  rbacMiddleware,
  validateFileUpload,
  FileController.uploadFile
);

/**
 * GET /api/files/download?path=...
 * 1. authMiddleware: Checks if user is authenticated via Windows IWA.
 * 2. rbacMiddleware: Checks if user has allowed roles.
 * 3. FileController.downloadFile: Performs complex ABAC/RBAC ownership validation.
 */
router.get('/download', authMiddleware, rbacMiddleware, FileController.downloadFile);

export default router;
