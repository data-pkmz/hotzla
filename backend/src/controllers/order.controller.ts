import type { Request, Response } from 'express';
import type { OrderQueryParams } from 'shared-types';

import { OrderService } from '../services/order.service';
import { AuthService } from '../services/auth.service';
import { checkoutSchema } from '../validations/order.validation';
import logger from '../utils/logger';

const authService = new AuthService();

/**
 * Resolves the authenticated request identity to the corresponding
 * application user stored in the database.
 *
 * Expects:
 * - req.user.adUsername: The authenticated user's AD username, populated
 *   by authMiddleware before this helper is called.
 *
 * Does:
 * - Reads the AD username from the authenticated request.
 * - Throws an "Unauthorized" error if no authenticated identity is available.
 * - Calls AuthService.getOrCreateUser to retrieve the corresponding database
 *   user, creating one with the default role if necessary.
 *
 * Returns:
 * - The authenticated application user, including their database ID and role.
 *
 * Throws:
 * - An Error with message "Unauthorized" when req.user.adUsername is missing.
 * - Any error produced while retrieving or creating the database user.
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
   * Expects:
   * - req.user.adUsername: The authenticated user's AD username.
   * - req.body: Checkout data matching checkoutSchema, including:
   *   - customer information, including the requesting unit.
   *   - budgetOfficer.fullName: Name of the budget officer.
   *   - budgetOfficer.militaryEmail: Email address used for budget approval.
   *   - notes: Optional notes associated with the order.
   *
   * Does:
   * - Validates the submitted checkout data using checkoutSchema.
   * - Resolves the authenticated application user.
   * - Passes the user's database ID and validated checkout details to
   *   OrderService.createOrderFromCart.
   * - OrderService converts the active cart into an order and performs the
   *   related order-creation workflow.
   *
   * Sends:
   * - 201 with the newly created order when checkout succeeds.
   * - 400 with validation details when the checkout data is invalid.
   * - 500 with an error message if order creation fails unexpectedly.
   *
   * Route:
   * - POST /api/cart/checkout
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

      logger.error('Error during checkout process', { error });

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }

  /**
   * Retrieves the orders visible to the authenticated user for the
   * "My Orders" view.
   *
   * Expects:
   * - req.user.adUsername: The authenticated user's AD username.
   *
   * Does:
   * - Resolves the authenticated application user and their role.
   * - Calls OrderService.getOrders with the user's ID and role so that
   *   the service can apply the appropriate access rules.
   * - Requests up to 100 orders, sorted from newest to oldest.
   *
   * Sends:
   * - 200 with success=true and the visible orders.
   * - 500 with an error message if the orders cannot be retrieved.
   *
   * Route:
   * - GET /api/orders/my-orders
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

      logger.error('Error getting user orders', { error });

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }

  /**
   * Retrieves the details of a single order.
   *
   * Expects:
   * - req.user.adUsername: The authenticated user's AD username.
   * - req.params.id: UUID of the order to retrieve.
   *
   * Does:
   * - Resolves the authenticated application user and role.
   * - Calls OrderService.getOrderById with the requested order ID and
   *   current user's access information.
   * - OrderService applies the role/ownership rules that determine whether
   *   the user may access the requested order.
   *
   * Sends:
   * - 200 with success=true and the order details when access is allowed.
   * - 500 with an error message if the order cannot be retrieved or access
   *   validation fails.
   *
   * Route:
   * - GET /api/orders/:id
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
   * Retrieves a paginated and optionally filtered list of orders visible
   * to the authenticated user.
   *
   * Expects:
   * - req.user.adUsername: The authenticated user's AD username.
   * - req.query.page: Optional page number. Defaults to 1.
   * - req.query.limit: Optional number of results per page. Defaults to 100.
   * - req.query.status: Optional order-status filter.
   * - req.query.search: Optional search term.
   * - req.query.sortBy: Optional field used to sort the results.
   * - req.query.sortOrder: Optional "asc" or "desc" direction.
   *   Defaults to "desc".
   *
   * Does:
   * - Resolves the authenticated application user and their role.
   * - Converts the request query parameters into OrderQueryParams.
   * - Calls OrderService.getOrders with both the user's access information
   *   and the requested pagination/filter/sorting options.
   * - OrderService applies the appropriate role-based visibility rules.
   *
   * Sends:
   * - 200 with success=true and the paginated order result.
   * - 500 with an error message if the orders cannot be retrieved.
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

      logger.error('Error getting orders', { error });

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }
}
