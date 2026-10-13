import type { Request, Response } from 'express';
import type { OrderQueryParams } from 'shared-types';

import { AuthService } from '../services/auth.service';
import { OrderService } from '../services/order.service';
import logger from '../utils/logger';
import { checkoutSchema } from '../validations/order.validation';

const authService = new AuthService();

/**
 * Resolves the authenticated request identity to the corresponding
 * application user stored in the database.
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
   * Creates an order from the authenticated user's active cart.
   *
   * Route:
   * POST /api/orders/checkout
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

      logger.error('Error during checkout process', {
        error,
      });

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }

  /**
   * Retrieves the orders visible to the authenticated requester.
   *
   * Route:
   * GET /api/orders/my-orders
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

      logger.error('Error getting user orders', {
        error,
      });

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }

  /**
   * Retrieves the details of a single order.
   *
   * Route:
   * GET /api/orders/:id
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

      logger.error('Error getting order details', {
        error,
        orderId: req.params.id,
      });

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }

  /**
   * Retrieves a paginated and optionally filtered order list.
   *
   * Route:
   * GET /api/orders
   */
  static async getOrders(req: Request, res: Response) {
    try {
      const user = await getCurrentUser(req);

      const params: OrderQueryParams = {
        page: Number(req.query.page) || 1,

        limit: Number(req.query.limit) || 100,

        status: req.query.status as OrderQueryParams['status'],

        search: req.query.search as string | undefined,

        sortBy: req.query.sortBy as OrderQueryParams['sortBy'],

        sortOrder: req.query.sortOrder === 'asc' ? 'asc' : 'desc',
      };

      const result = await OrderService.getOrders(
        {
          id: user.id,
          role: user.role,
        },
        params
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error getting orders', {
        error,
      });

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }
}
