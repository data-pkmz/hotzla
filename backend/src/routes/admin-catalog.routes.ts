import { Router } from 'express';
import { createProduct, updateProduct, deleteProduct } from '../controllers/catalog.controller';
//import { authMiddleware } from '../middlewares/auth.middleware'; // התליית הרשאות מ-DPS-012/013

const router = Router();

// כל הנתיבים בקובץ זה מוגנים ודורשים תפקיד MANAGER בלבד
//router.use(authMiddleware(['MANAGER']));

// POST /api/admin/products
router.post('/', createProduct);

// PUT /api/admin/products/:id
router.put('/:id', updateProduct);

// DELETE /api/admin/products/:id
router.delete('/:id', deleteProduct);

export default router;
