import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { FileStorageService } from '../services/file-storage.service';
import { AuthService } from '../services/auth.service';
import { prisma } from '../config/db';
import logger from '../utils/logger';

// We use the globally augmented Express Request from express.d.ts

export class FileController {
  /**
   * Handles file uploads.
   * Expects Multer middleware to have processed the file into req.file.
   */
  static async uploadFile(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    try {
      // Save the file using our storage service
      const filePath = await FileStorageService.saveFile(req.file.buffer, req.file.originalname);
      res.status(200).json({ filePath });
    } catch (error) {
      logger.error('Error saving file:', error);
      res.status(500).json({ error: 'Internal server error while saving the file' });
    }
  }

  /**
   * Handles secure file downloads.
   * Verifies if the requester has permission to access the file based on the database ownership.
   */
  static async downloadFile(req: Request, res: Response): Promise<void> {
    const filePath = req.query.path as string | undefined;

    if (!filePath) {
      res.status(400).json({ error: 'Missing path parameter' });
      return;
    }

    try {
      // 1. Authenticate the user through AuthService
      const adUsername = req.user?.adUsername;

      if (!adUsername) {
        res.status(401).json({ error: 'Unauthorized: Missing user identity' });
        return;
      }

      const authService = new AuthService();
      const user = await authService.getOrCreateUser(adUsername);

      // 2. Allow privileged roles unconditionally
      if (user.role === Role.MANAGER || user.role === Role.WORKER) {
        return FileController.sendFile(filePath, res);
      }

      // 3. For REQUESTER, verify ownership via CartItem
      const cartItem = await prisma.cartItem.findFirst({
        where: { uploadedFilePath: filePath },
        include: { cart: true },
      });

      if (cartItem && cartItem.cart.userId === user.id) {
        return FileController.sendFile(filePath, res);
      }

      // 4. Verify ownership via OrderItem (if the cart has been converted to an order)
      const orderItem = await prisma.orderItem.findFirst({
        where: { uploadedFilePath: filePath },
        include: { order: true },
      });

      if (orderItem && orderItem.order.requesterId === user.id) {
        return FileController.sendFile(filePath, res);
      }

      // 5. User is not the owner and doesn't have privileges
      res.status(403).json({ error: 'Forbidden: You do not have permission to access this file' });
    } catch (error) {
      logger.error('Error downloading file:', error);
      res.status(500).json({ error: 'Internal server error while processing download' });
    }
  }

  /**
   * Helper method to securely resolve and send the file to the client.
   */
  private static sendFile(relativePath: string, res: Response): void {
    try {
      // Validates path traversal security
      const absolutePath = FileStorageService.getSecureAbsolutePath(relativePath);

      // Serve the file to the browser
      res.sendFile(absolutePath, (err) => {
        if (err) {
          logger.error('Error sending file to client:', err);
          if (!res.headersSent) {
            res.status(404).json({ error: 'File not found on disk' });
          }
        }
      });
    } catch {
      // Caught the security path traversal error
      res.status(403).json({ error: 'Invalid file path' });
    }
  }
}
