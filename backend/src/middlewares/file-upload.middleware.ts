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
 * Supported file types detected from content binary signatures.
 */
export type DetectedFileType = 'pdf' | 'png' | 'jpeg';

/**
 * Inspects a file buffer's magic bytes (binary signatures) to detect its actual type.
 *
 * Supported formats:
 * - PDF: Starts with "%PDF" (0x25, 0x50, 0x44, 0x46)
 * - PNG: Standard 8-byte signature (0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
 * - JPEG: Starts with SOI marker (0xFF, 0xD8, 0xFF)
 */
export function detectFileTypeFromBuffer(buffer: Buffer): DetectedFileType | null {
  if (!buffer || buffer.length < 3) {
    return null;
  }

  // Check PDF (%PDF)
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF') {
    return 'pdf';
  }

  // Check PNG (8 bytes: \x89PNG\r\n\x1a\n)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // Check JPEG (0xFF, 0xD8, 0xFF)
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  return null;
}

/**
 * Validates a single uploaded file before the request reaches the controller.
 *
 * Expects:
 * - multipart/form-data containing a file field named "file".
 *
 * Does:
 * - Runs Multer's single-file parser.
 * - Validates file size, declared MIME type, and filename extension.
 * - Validates actual binary content using magic bytes to reject spoofed/fake files.
 * - Places the accepted file on req.file using in-memory storage.
 *
 * Sends:
 * - 400 with a Hebrew size-limit error when the file exceeds 20 MB.
 * - 400 with the validation error message when the file type or extension
 *   is unsupported.
 * - 400 with a content mismatch error when magic bytes do not match declared type.
 * - 400 with a generic upload error for unknown Multer failures.
 *
 * Calls:
 * - next() when the uploaded file passes validation.
 */
export const validateFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      if (!req.file || !req.file.buffer) {
        res.status(400).json({
          error: 'No file provided',
        });
        return;
      }

      const detectedType = detectFileTypeFromBuffer(req.file.buffer);
      const extension = path.extname(req.file.originalname).toLowerCase();
      const mimetype = req.file.mimetype;

      const isValid =
        (detectedType === 'pdf' && extension === '.pdf' && mimetype === 'application/pdf') ||
        (detectedType === 'png' && extension === '.png' && mimetype === 'image/png') ||
        (detectedType === 'jpeg' &&
          (extension === '.jpg' || extension === '.jpeg') &&
          mimetype === 'image/jpeg');

      if (!detectedType || !isValid) {
        res.status(400).json({
          error: 'פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.',
        });
        return;
      }

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
