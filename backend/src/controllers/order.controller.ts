import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';

// Define the Zod schema for Checkout directly in the file (or imported from a separate validation file)
const checkoutSchema = z.object({
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
  // POST /api/cart/checkout - Execute Checkout and create an order enforcing Zod validation
  static async checkout(req: Request, res: Response) {
    try {
      // Run Zod validation on the data received in the Body
      const validationResult = checkoutSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: 'שגיאה בנתוני ה-Checkout - חסרים או שגויים שדות חובה',
          details: validationResult.error.format(),
        });
      }

      const orderData = validationResult.data;

      // TODO: Create the order in the DB and clear the cart
      return res.status(201).json({
        message: 'ההזמנה נוצרה בהצלחה',
        order: orderData,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error during checkout process:', errorMessage);
      return res.status(500).json({ error: errorMessage });
    }
  }
}
