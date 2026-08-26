import type { Request, Response } from 'express';

import { OrderService } from '../services/order.service';
import { AuthService } from '../services/auth.service';
import { checkoutSchema } from '../validations/order.validation';
import logger from '../utils/logger';

const authService = new AuthService();

/**
 * Resolves the authenticated AD username to the application user.
 */
const getCurrentUser = async (req: Request) => {
  const adUsername = req.user?.adUsername;

  if (!adUsername) {
    throw new Error('Unauthorized');
  }

  return authService.getOrCreateUser(adUsername);
};

export class OrderController {
  /**
   * POST /api/cart/checkout
   *
   * Validates checkout input and creates an order from
   * the authenticated user's active cart.
   */
  static async checkout(req: Request, res: Response) {
    try {
      const validationResult = checkoutSchema.safeParse(req.body);

      if (!validationResult.success) {
        logger.warn('Checkout validation failed', {
          errors: validationResult.error.format(),
        });

        return res.status(400).json({
          error: 'שגיאה בנתוני ה-Checkout - חסרים או שגויים שדות חובה',
          details: validationResult.error.format(),
        });
      }

      const { customer, budgetOfficer, notes } = validationResult.data;

      const user = await getCurrentUser(req);

      const newOrder = await OrderService.createOrderFromCart(user.id, {
        budgetOfficerName: budgetOfficer.fullName,
        budgetOfficerEmail: budgetOfficer.militaryEmail,
        unit: customer.unit,
        notes,
      });

      return res.status(201).json({
        message: 'ההזמנה נוצרה בהצלחה במערכת',
        order: newOrder,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error during checkout process:', errorMessage);

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/orders/my-orders
   *
   * Returns orders according to the current user's access rules.
   */
  static async getMyOrders(req: Request, res: Response) {
    try {
      const user = await getCurrentUser(req);

      const result = await OrderService.getOrders(
        {
          id: user.id,
          role: user.role,
        },
        {
          page: 1,
          limit: 100,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }
      );

      return res.status(200).json({
        success: true,
        data: result.orders,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error getting user orders:', errorMessage);

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/orders/:id
   *
   * Returns one order after applying role-based access validation.
   */
  static async getOrderById(req: Request, res: Response) {
    try {
      const user = await getCurrentUser(req);

      const order = await OrderService.getOrderById(req.params.id, {
        id: user.id,
        role: user.role,
      });

      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error getting order details:', errorMessage);

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }
}
