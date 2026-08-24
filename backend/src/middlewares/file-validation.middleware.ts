import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
  },

  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.'));
    }

    cb(null, true);
  },
});

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
