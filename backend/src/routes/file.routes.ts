import { Router } from 'express';
import { FileController } from '../controllers/file.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateFileUpload } from '../middlewares/file-validation.middleware';

const router = Router();

/**
 * POST /api/files/upload
 * 1. authMiddleware: Checks if user is authenticated via Windows IWA.
 * 2. upload.single('file'): Multer intercepts the binary chunks and creates req.file.
 * 3. FileController.uploadFile: Saves the file to disk and returns the DB path.
 */
router.post('/upload', authMiddleware, validateFileUpload, FileController.uploadFile);

/**
 * GET /api/files/download?path=...
 * 1. authMiddleware: Checks if user is authenticated via Windows IWA.
 * 2. FileController.downloadFile: Performs complex ABAC/RBAC ownership validation.
 */
router.get('/download', authMiddleware, FileController.downloadFile);

export default router;
