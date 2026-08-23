import { Router } from 'express';
import multer from 'multer';
import { FileController } from '../controllers/file.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * Configure Multer
 * - Storage: We keep the file in RAM (memoryStorage) briefly before our Service writes it to disk.
 * - Limits: 20 MB maximum per the SDD (Chapter 16).
 * - Filter: Only allow PDF and JPEG formats.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error('Non authorized format, only pdf and jpeg allowed.'));
    }
  },
});

/**
 * POST /api/files/upload
 * 1. authMiddleware: Checks if user is authenticated via Windows IWA.
 * 2. upload.single('file'): Multer intercepts the binary chunks and creates req.file.
 * 3. FileController.uploadFile: Saves the file to disk and returns the DB path.
 */
router.post('/upload', authMiddleware, upload.single('file'), FileController.uploadFile);

/**
 * GET /api/files/download?path=...
 * 1. authMiddleware: Checks if user is authenticated via Windows IWA.
 * 2. FileController.downloadFile: Performs complex ABAC/RBAC ownership validation.
 */
router.get('/download', authMiddleware, FileController.downloadFile);

export default router;
