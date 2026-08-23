import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.'));
  }

  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

export const uploadFile = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'הקובץ שנבחר גדול מדי. הגודל המרבי המותר הוא 20MB.',
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(400).json({
      message: 'File upload failed.',
    });
  });
};
