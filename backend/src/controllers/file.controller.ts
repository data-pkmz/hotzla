import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { FileStorageService } from '../services/file-storage.service';
import { AuthService } from '../services/auth.service';
import { prisma } from '../config/db';
import logger from '../utils/logger';

// Uses the globally augmented Express Request type defined in express.d.ts.

export class FileController {
  /**
   * Saves an uploaded file to the application's configured file storage.
   *
   * Expects:
   * - req.file: A file processed by the upload-validation/Multer middleware.
   * - req.file.buffer: The binary contents of the uploaded file.
   * - req.file.originalname: The original filename supplied by the client.
   *
   * Does:
   * - Verifies that Multer placed a file on the request.
   * - Passes the file buffer and original filename to FileStorageService.
   * - FileStorageService writes the file to disk and returns its relative
   *   storage path.
   *
   * Sends:
   * - 200 with the relative filePath after the file is successfully saved.
   * - 400 if no file was provided.
   * - 500 if the file cannot be saved.
   *
   * Note:
   * - File type and size validation are expected to occur in middleware
   *   before this controller is reached.
   */
  static async uploadFile(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({
        error: 'No file provided',
      });
      return;
    }

    try {
      const filePath = await FileStorageService.saveFile(req.file.buffer, req.file.originalname);

      res.status(200).json({
        filePath,
      });
    } catch (error) {
      logger.error('Error saving file', { error });

      res.status(500).json({
        error: 'Internal server error while saving the file',
      });
    }
  }

  /**
   * Serves an image that is registered as a product catalog image.
   *
   * Expects:
   * - req.query.path: Relative storage path of the requested product image.
   *
   * Does:
   * - Verifies that a path query parameter was provided.
   * - Searches the Product table for a product whose imageUrl matches
   *   the requested path.
   * - Only allows the file to be served when the path is referenced by
   *   an existing product.
   * - Delegates secure path resolution and file delivery to sendFile.
   *
   * Sends:
   * - The requested image file when the product image is valid.
   * - 400 if the path query parameter is missing.
   * - 404 if no product references the requested image path.
   * - 403 if sendFile determines that the supplied path is unsafe.
   * - 404 if the referenced file does not exist on disk.
   * - 500 if an unexpected error occurs while looking up the product image.
   */
  static async downloadProductImage(req: Request, res: Response): Promise<void> {
    const filePath = req.query.path as string | undefined;

    if (!filePath) {
      res.status(400).json({
        error: 'Missing path parameter',
      });
      return;
    }

    try {
      const product = await prisma.product.findFirst({
        where: {
          imageUrl: filePath,
        },
        select: {
          id: true,
        },
      });

      if (!product) {
        res.status(404).json({
          error: 'Product image not found',
        });
        return;
      }

      return FileController.sendFile(filePath, res);
    } catch (error) {
      logger.error('Error downloading product image', {
        error,
        filePath,
      });

      res.status(500).json({
        error: 'Internal server error while processing product image',
      });
    }
  }

  /**
   * Securely serves an uploaded order/cart file to an authorized user.
   *
   * Expects:
   * - req.query.path: Relative storage path of the requested file.
   * - req.user.adUsername: The authenticated user's AD username, populated
   *   by authMiddleware before this controller is reached.
   *
   * Does:
   * - Verifies that a file path was supplied.
   * - Resolves the authenticated application user through AuthService.
   * - Allows MANAGER and WORKER users to access uploaded files regardless
   *   of ownership.
   * - For REQUESTER users, checks whether the requested file belongs to
   *   one of their cart items.
   * - If the file is no longer associated with a cart item, checks whether
   *   it belongs to one of their order items.
   * - Delegates secure path resolution and file delivery to sendFile when
   *   authorization succeeds.
   *
   * Sends:
   * - The requested file when the user is authorized to access it.
   * - 400 if the path query parameter is missing.
   * - 401 if no authenticated user identity is available.
   * - 403 if the user does not have permission to access the file.
   * - 403 if sendFile determines that the supplied path is unsafe.
   * - 404 if an authorized file does not exist on disk.
   * - 500 if an unexpected error occurs while processing the download.
   */
  static async downloadFile(req: Request, res: Response): Promise<void> {
    const filePath = req.query.path as string | undefined;

    if (!filePath) {
      res.status(400).json({
        error: 'Missing path parameter',
      });
      return;
    }

    try {
      const adUsername = req.user?.adUsername;

      if (!adUsername) {
        res.status(401).json({
          error: 'Unauthorized: Missing user identity',
        });
        return;
      }

      const authService = new AuthService();
      const user = await authService.getOrCreateUser(adUsername);

      // Managers and workers are permitted to access uploaded production files.
      if (user.role === Role.MANAGER || user.role === Role.WORKER) {
        return FileController.sendFile(filePath, res);
      }

      // Requesters may access files associated with their own cart items.
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          uploadedFilePath: filePath,
        },
        include: {
          cart: true,
        },
      });

      if (cartItem && cartItem.cart.userId === user.id) {
        return FileController.sendFile(filePath, res);
      }

      // After checkout, the same uploaded file may instead be associated
      // with an order item belonging to the requester.
      const orderItem = await prisma.orderItem.findFirst({
        where: {
          uploadedFilePath: filePath,
        },
        include: {
          order: true,
        },
      });

      if (orderItem && orderItem.order.requesterId === user.id) {
        return FileController.sendFile(filePath, res);
      }

      res.status(403).json({
        error: 'Forbidden: You do not have permission to access this file',
      });
    } catch (error) {
      logger.error('Error downloading file', {
        error,
        filePath,
      });

      res.status(500).json({
        error: 'Internal server error while processing download',
      });
    }
  }

  /**
   * Resolves a relative storage path and sends the corresponding file
   * to the client.
   *
   * Expects:
   * - relativePath: Relative path previously returned by FileStorageService.
   * - res: Express Response used to deliver the file.
   *
   * Does:
   * - Calls FileStorageService.getSecureAbsolutePath to resolve the relative
   *   path and prevent directory/path traversal outside the storage directory.
   * - Uses Express res.sendFile to stream the resolved file to the client.
   *
   * Sends:
   * - The requested file when the path is valid and the file exists.
   * - 404 if the resolved file cannot be found or sent.
   * - 403 if the supplied relative path fails the storage security check.
   *
   * Returns:
   * - Nothing. The method completes the HTTP response through Express.
   */
  private static sendFile(relativePath: string, res: Response): void {
    try {
      const absolutePath = FileStorageService.getSecureAbsolutePath(relativePath);

      res.sendFile(absolutePath, (error) => {
        if (error) {
          logger.error('Error sending file to client', {
            error,
            relativePath,
          });

          if (!res.headersSent) {
            res.status(404).json({
              error: 'File not found on disk',
            });
          }
        }
      });
    } catch (error) {
      logger.warn('Rejected invalid file path', {
        error,
        relativePath,
      });

      res.status(403).json({
        error: 'Invalid file path',
      });
    }
  }
}
