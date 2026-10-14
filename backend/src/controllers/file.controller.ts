import { Request, Response } from 'express';
import path from 'path';
import { Role } from '@prisma/client';
import { FileStorageService } from '../services/file-storage.service';
import { AuthService } from '../services/auth.service';
import { prisma } from '../config/db';
import logger from '../utils/logger';

// Uses the globally augmented Express Request type defined in express.d.ts.

export class FileController {
  /**
   * Saves an uploaded file to the application's configured file storage.
   * Associates the storage path with the authenticated uploader's userId.
   *
   * Expects:
   * - req.file: A file processed by the upload-validation/Multer middleware.
   * - req.file.buffer: The binary contents of the uploaded file.
   * - req.file.originalname: The original filename supplied by the client.
   *
   * Does:
   * - Verifies that Multer placed a file on the request.
   * - Resolves the authenticated user ID.
   * - Passes the file buffer, original filename, and user ID to FileStorageService.
   * - FileStorageService writes the file to disk and returns its relative
   *   storage path scoped to the uploader.
   *
   * Sends:
   * - 200 with the relative filePath after the file is successfully saved.
   * - 400 if no file was provided.
   * - 500 if the file cannot be saved.
   */
  static async uploadFile(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({
        error: 'No file provided',
      });
      return;
    }

    try {
      const authService = new AuthService();
      const adUsername = req.user?.adUsername;
      const user =
        req.dbUser || (adUsername ? await authService.getOrCreateUser(adUsername) : null);

      const filePath = await FileStorageService.saveFile(
        req.file.buffer,
        req.file.originalname,
        user?.id
      );

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
   * - Validates that the requested path has an image extension (JPEG, PNG, WebP, SVG).
   * - Searches the Product table for an active (non-deleted) product whose
   *   imageUrl matches the requested path.
   * - Only allows the file to be served when the path is referenced by
   *   an active product.
   * - Delegates secure path resolution and file delivery to sendFile.
   *
   * Sends:
   * - The requested image file when the product image is valid.
   * - 400 if the path query parameter is missing or has a non-image extension.
   * - 404 if no active product references the requested image path.
   * - 403 if sendFile determines that the supplied path is unsafe.
   * - 404 if the referenced file does not exist on disk.
   * - 500 if an unexpected error occurs while looking up the product image.
   */
  static async downloadProductImage(req: Request, res: Response): Promise<void> {
    const filePath = req.query.path as string | undefined;

    if (!filePath || typeof filePath !== 'string' || filePath.includes('\0')) {
      res.status(400).json({
        error: 'Missing or invalid path parameter',
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];

    if (!allowedImageExtensions.includes(ext)) {
      res.status(400).json({
        error: 'Invalid product image type',
      });
      return;
    }

    try {
      const product = await prisma.product.findFirst({
        where: {
          imageUrl: filePath,
          isDeleted: false,
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
   * - req.user.adUsername: The authenticated user's AD username.
   *
   * Does:
   * - Verifies that a file path was supplied.
   * - Resolves the authenticated application user.
   * - Allows MANAGER and WORKER users to access uploaded files regardless
   *   of ownership.
   * - For REQUESTER users:
   *   1. Checks whether the requested file belongs to an active, non-deleted cart item.
   *   2. Checks whether it belongs to an active, non-deleted order item.
   *   3. Rejects with 403 if the file was in a cart item that was soft-deleted.
   *   4. Allows access if the file was uploaded by this requester and has not been deleted.
   *   5. Rejects any attempt to access files belonging to another user.
   * - Delegates secure path resolution and file delivery to sendFile when
   *   authorization succeeds.
   *
   * Sends:
   * - The requested file when the user is authorized to access it.
   * - 400 if the path query parameter is missing or contains invalid characters.
   * - 401 if no authenticated user identity is available.
   * - 403 if the user does not have permission to access the file or it was soft-deleted.
   * - 403 if sendFile determines that the supplied path is unsafe.
   * - 404 if an authorized file does not exist on disk.
   * - 500 if an unexpected error occurs while processing the download.
   */
  static async downloadFile(req: Request, res: Response): Promise<void> {
    const filePath = req.query.path as string | undefined;

    if (!filePath || typeof filePath !== 'string' || filePath.includes('\0')) {
      res.status(400).json({
        error: 'Missing or invalid path parameter',
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
      const user = req.dbUser || (await authService.getOrCreateUser(adUsername));

      // Managers and workers are permitted to access uploaded production files.
      if (user.role === Role.MANAGER || user.role === Role.WORKER) {
        return FileController.sendFile(filePath, res);
      }

      // 1. Requesters may access files associated with their own active cart items.
      const activeCartItem = await prisma.cartItem.findFirst({
        where: {
          uploadedFilePath: filePath,
          isDeleted: false,
          cart: {
            userId: user.id,
            isDeleted: false,
          },
        },
        include: {
          cart: true,
        },
      });

      if (activeCartItem) {
        return FileController.sendFile(filePath, res);
      }

      // 2. After checkout, the same uploaded file may be associated
      // with an active order item belonging to the requester.
      const activeOrderItem = await prisma.orderItem.findFirst({
        where: {
          uploadedFilePath: filePath,
          isDeleted: false,
          order: {
            requesterId: user.id,
            isDeleted: false,
          },
        },
        include: {
          order: true,
        },
      });

      if (activeOrderItem) {
        return FileController.sendFile(filePath, res);
      }

      // 3. Check for soft-delete: If the file belongs to this user but was soft-deleted in cart
      const softDeletedCartItem = await prisma.cartItem.findFirst({
        where: {
          uploadedFilePath: filePath,
          cart: {
            userId: user.id,
          },
          OR: [{ isDeleted: true }, { cart: { isDeleted: true } }],
        },
      });

      if (softDeletedCartItem) {
        res.status(403).json({
          error: 'Forbidden: File has been deleted or is no longer accessible',
        });
        return;
      }

      // 4. Initial upload: file was uploaded by this requester and not yet added to cart
      const uploaderId = FileStorageService.extractUploaderId(filePath);
      if (uploaderId && uploaderId === user.id) {
        return FileController.sendFile(filePath, res);
      }

      // 5. File belongs to another user or is unauthorized
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
