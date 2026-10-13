import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';

/**
 * Maximum accepted upload size: 20 MB.
 */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * MIME types accepted by the upload middleware.
 */
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/**
 * Filename extensions accepted by the upload middleware.
 *
 * Both MIME type and file extension must be valid for an upload to pass.
 */
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

/**
 * Multer configuration used to process uploaded files.
 *
 * Expects:
 * - multipart/form-data uploads.
 * - A file field named "file".
 *
 * Does:
 * - Stores the uploaded file temporarily in memory as a Buffer.
 * - Rejects files larger than the configured maximum size.
 * - Verifies both MIME type and filename extension.
 *
 * Returns:
 * - A validated file on req.file when accepted.
 * - A Multer/Error object to the callback when validation fails.
 */
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE + 1,
  },

  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const isMimeTypeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);

    const isExtensionAllowed = ALLOWED_EXTENSIONS.includes(extension);

    if (!isMimeTypeAllowed || !isExtensionAllowed) {
      return cb(new Error('פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.'));
    }

    cb(null, true);
  },
});

/**
 * Validates a single uploaded file before the request reaches the controller.
 *
 * Expects:
 * - multipart/form-data containing a file field named "file".
 *
 * Does:
 * - Runs Multer's single-file parser.
 * - Validates file size, MIME type, and filename extension.
 * - Places the accepted file on req.file using in-memory storage.
 *
 * Sends:
 * - 400 with a Hebrew size-limit error when the file exceeds 20 MB.
 * - 400 with the validation error message when the file type or extension
 *   is unsupported.
 * - 400 with a generic upload error for unknown Multer failures.
 *
 * Calls:
 * - next() when the uploaded file passes validation.
 */
export const validateFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: 'הקובץ שנבחר גדול מדי. הגודל המרבי המותר הוא 20MB.',
      });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({
        error: error.message,
      });
      return;
    }

    res.status(400).json({
      error: 'File upload failed.',
    });
  });
};
