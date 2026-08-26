import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { AuthService } from '../services/auth.service';
import { checkoutSchema } from '../validations/order.validation';
import logger from '../utils/logger';

const authService = new AuthService();

// Helper to get the real user ID from the database using the AD username
const getUserId = async (req: Request) => {
  const adUsername = req.user?.adUsername;
  if (!adUsername) throw new Error('Unauthorized');

  const user = await authService.getOrCreateUser(adUsername);
  return user.id;
};

export class OrderController {
  // POST /api/cart/checkout - Execute Checkout and create an order using OrderService
  static async checkout(req: Request, res: Response) {
    try {
      const validationResult = checkoutSchema.safeParse(req.body);

      if (!validationResult.success) {
        logger.warn('Checkout validation failed', { errors: validationResult.error.format() });
        return res.status(400).json({
          error: 'שגיאה בנתוני ה-Checkout - חסרים או שגויים שדות חובה',
          details: validationResult.error.format(),
        });
      }

      const { customer, budgetOfficer, notes } = validationResult.data;
      const userId = await getUserId(req);

      // Call the existing Service to handle the heavy lifting (Transactions, Pricing, Sequence Gen)
      const newOrder = await OrderService.createOrderFromCart(userId, {
        budgetOfficerName: budgetOfficer.fullName,
        budgetOfficerEmail: budgetOfficer.militaryEmail,
        unit: customer.unit,
        notes: notes,
      });

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
