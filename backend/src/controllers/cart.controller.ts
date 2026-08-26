import { Request, Response } from 'express';
import { prisma } from '../config/db';
import logger from '../utils/logger';

export class CartController {
  // GET /api/cart - Fetch the user's active cart
  static async getActiveCart(req: Request, res: Response) {
    try {
      logger.info('Fetching active cart request received');
      
      // ניתן לקבל את ה-userId מתוך ה-headers או להגדיר ברירת מחדל לפיתוח
      const userId = (req.headers['x-user-id'] as string) || '123e4567-e89b-12d3-a456-426614174000';

      let cart = await prisma.cart.findFirst({
        where: { userId, status: 'ACTIVE', isDeleted: false },
        include: {
          cartItemEntries: {
            where: { isDeleted: false },
            include: { product: true },
          },
        },
      });

      // אם אין עגלה פעילה, ניצור אחת חדשה עבור המשתמש
      if (!cart) {
        logger.info(`No active cart found for user ${userId}, creating a new one.`);
        cart = await prisma.cart.create({
          data: {
            userId,
            status: 'ACTIVE',
            updatedAt: new Date(),
          },
          include: {
            cartItemEntries: { include: { product: true } },
          },
        });
      }

      logger.info(`Active cart successfully retrieved for user ${userId}`);
      return res.status(200).json({ message: 'העגלה נשלפה בהצלחה', cart });
    } catch (error) {
      // הדפסת השגיאה המלאה ללוג כדי לראות בדיוק מה הבעיה במסד הנתונים
      logger.error('Error fetching active cart details:', { error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: errorMessage });
    }
  }

  // POST /api/cart/items - Add an item to the cart
  static async addItem(req: Request, res: Response) {
    try {
      logger.info('Add item to cart request received', { body: req.body });
      const { cartId, productId, quantity, uploadedFilePath, computedPrice, selectedAttributes } = req.body;

      const newItem = await prisma.cartItem.create({
        data: {
          cartId,
          productId,
          quantity,
          uploadedFilePath: uploadedFilePath || '',
          computedPrice: computedPrice || 0,
          selectedAttributes: selectedAttributes || {},
        },
      });

      logger.info(`Item ${newItem.id} successfully added to cart ${cartId}`);
      return res.status(201).json({ message: 'הפריט נוסף בהצלחה', item: newItem });
    } catch (error) {
      logger.error('Error adding item to cart details:', { error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: errorMessage });
    }
  }

  // DELETE /api/cart/items/:id - Remove an item
  static async removeItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`Remove item request received for item ID: ${id}`);

      await prisma.cartItem.update({
        where: { id },
        data: { isDeleted: true },
      });

      logger.info(`Item ${id} successfully marked as deleted`);
      return res.status(200).json({ message: `הפריט ${id} הוסר בהצלחה` });
    } catch (error) {
      logger.error(`Error removing item ${req.params.id} details:`, { error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: errorMessage });
    }
  }
}