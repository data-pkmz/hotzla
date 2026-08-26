import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import logger from '../utils/logger';

// הגדרת סכמת ה-Zod ל-Checkout
const checkoutSchema = z.object({
  requesterId: z.string().uuid('מזהה מזמין לא תקין'),
  cartId: z.string().uuid('מזהה עגלה לא תקין'),
  customer: z.object({
    name: z.string().min(2, 'שם מזמין הוא שדה חובה'),
    phone: z.string().min(9, 'מספר טלפון לא תקין'),
    orgEmail: z.string().email('מייל ארגוני לא תקין'),
    unit: z.string().min(1, 'יחידה היא שדה חובה'),
  }),
  budgetOfficer: z.object({
    fullName: z.string().min(2, 'שם מלא של קצין תקציב הוא שדה חובה'),
    militaryEmail: z
      .string()
      .email('מייל צבאי לא תקין')
      .refine((val) => val.endsWith('.mil') || val.endsWith('.idf.il') || val.includes('idf'), {
        message: 'יש להזין מייל צבאי תקין',
      }),
  }),
  deliveryDueDate: z.string().min(1, 'תאריך יעד מבוקש לאספקה הוא שדה חובה'),
  notes: z.string().optional(),
});

export class OrderController {
  // POST /api/cart/checkout - Execute Checkout and create an order enforcing Zod & Prisma
  static async checkout(req: Request, res: Response) {
    try {
      logger.info('Checkout request received', { body: req.body });

      // הפעלת וולידציית Zod
      const validationResult = checkoutSchema.safeParse(req.body);

      if (!validationResult.success) {
        logger.warn('Checkout validation failed', { errors: validationResult.error.format() });
        return res.status(400).json({
          error: 'שגיאה בנתוני ה-Checkout - חסרים או שגויים שדות חובה',
          details: validationResult.error.format(),
        });
      }

      const { requesterId, cartId, customer, budgetOfficer, notes } = validationResult.data;

      // שליפת פריטי העגלה מה-DB לצורך חישוב המחיר הכולל
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: { cartItemEntries: { where: { isDeleted: false } } },
      });

      if (!cart || cart.cartItemEntries.length === 0) {
        logger.warn(`Checkout failed: Cart ${cartId} is empty or not found.`);
        return res.status(400).json({ error: 'העגלה ריקה או לא קיימת' });
      }

      const totalPrice = cart.cartItemEntries.reduce(
        (sum, item) => sum + Number(item.computedPrice) * Number(item.quantity),
        0
      );

      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      logger.info(`Creating order ${orderNumber} in database via transaction`);

      // ביצוע טרנזקציית Prisma ליצירת ההזמנה, העתקת הפריטים ועדכון סטטוס העגלה
      const newOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            orderNumber,
            requesterId,
            unit: customer.unit,
            status: 'PENDING_BUDGET',
            budgetOfficerName: budgetOfficer.fullName,
            budgetOfficerEmail: budgetOfficer.militaryEmail,
            totalPrice,
          },
        });

        for (const cartItem of cart.cartItemEntries) {
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: cartItem.productId,
              uploadedFilePath: cartItem.uploadedFilePath,
              computedUnitPrice: cartItem.computedPrice,
              computedTotalPrice: Number(cartItem.computedPrice) * Number(cartItem.quantity),
            },
          });
        }

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            toStatus: 'PENDING_BUDGET',
            changedByUserId: requesterId,
            changedBySource: 'SYSTEM',
            note: notes || 'יצירת הזמנה חדשה דרך ה-Checkout',
          },
        });

        await tx.cart.update({
          where: { id: cartId },
          data: { status: 'CONVERTED', updatedAt: new Date() },
        });

        return order;
      });

      logger.info(`Order ${newOrder.id} (${orderNumber}) successfully created and cart ${cartId} converted.`);
      return res.status(201).json({
        message: 'ההזמנה נוצרה בהצלחה במערכת',
        order: newOrder,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error during checkout process:', errorMessage);
      return res.status(500).json({ error: errorMessage });
    }
  }
}