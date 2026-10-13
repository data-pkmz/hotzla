import { Router } from 'express';
import { FileController } from '../controllers/file.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles } from '../middlewares/rbac.middleware';
import { validateFileUpload } from '../middlewares/file-validation.middleware';

const router = Router();

/**
 * Allows all application roles that are permitted to work with files.
 *
 * Expects:
 * - authMiddleware to have resolved the authenticated database user.
 *
 * Does:
 * - Allows REQUESTER, MANAGER, and WORKER users to continue.
 * - Rejects users whose role is not included in the allowed role list.
 */
const rbacMiddleware = requireRoles(['REQUESTER', 'MANAGER', 'WORKER']);

/**
 * Uploads a file to application storage.
 *
 * Request:
 * - POST /api/files/upload
 * - Expects multipart/form-data containing a field named "file".
 *
 * Middleware flow:
 * 1. authMiddleware identifies the requesting user according to the
 *    configured authentication mode.
 * 2. rbacMiddleware verifies that the user's application role is allowed.
 * 3. validateFileUpload uses Multer to validate the file's type and size
 *    and places the accepted file on req.file.
 * 4. FileController.uploadFile saves the file through FileStorageService.
 *
 * Sends:
 * - The uploaded file's relative storage path on success.
 * - An authentication, authorization, validation, or server error when
 *   one of the preceding steps fails.
 */
router.post(
  '/upload',
  authMiddleware,
  rbacMiddleware,
  validateFileUpload,
  FileController.uploadFile
);

/**
 * Downloads an uploaded cart or order file.
 *
 * Request:
 * - GET /api/files/download?path=...
 * - Expects the relative storage path in the "path" query parameter.
 *
 * Middleware/controller flow:
 * 1. authMiddleware identifies the requesting user.
 * 2. rbacMiddleware verifies that the user has an allowed application role.
 * 3. FileController.downloadFile performs the file-specific authorization:
 *    - MANAGER and WORKER users may access uploaded production files.
 *    - REQUESTER users may access only files associated with their own
 *      cart items or orders.
 * 4. The controller securely resolves the file path and sends the file.
 *
 * Sends:
 * - The requested file when access is authorized.
 * - An authentication, authorization, not-found, invalid-path, or server
 *   error when the request cannot be completed.
 */
router.get('/download', authMiddleware, rbacMiddleware, FileController.downloadFile);

/**
 * Downloads an image used by the product catalog.
 *
 * Request:
 * - GET /api/files/product-image?path=...
 * - Expects the relative image storage path in the "path" query parameter.
 *
 * Middleware/controller flow:
 * 1. authMiddleware identifies the requesting user.
 * 2. rbacMiddleware verifies that the user has an allowed application role.
 * 3. FileController.downloadProductImage verifies that the requested path
 *    is referenced by a product's imageUrl.
 * 4. The controller securely resolves the path and sends the image.
 *
 * Sends:
 * - The requested catalog image when it is registered to a product.
 * - An authentication, authorization, not-found, invalid-path, or server
 *   error when the request cannot be completed.
 */
router.get('/product-image', authMiddleware, rbacMiddleware, FileController.downloadProductImage);

export default router;
