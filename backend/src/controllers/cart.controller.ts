import { Request, Response } from 'express';

import { CartService } from '../services/cart.service';
import logger from '../utils/logger';

/**
 * Resolves the authenticated application's database user ID from req.dbUser.
 *
 * Expects:
 * - req.dbUser: The authenticated application user populated by
 *   requireRoles middleware before this controller is called.
 *
 * Does:
 * - Verifies that the database user is available on the request.
 * - Returns the already-resolved database user ID.
 *
 * Returns:
 * - The database ID of the authenticated user.
 *
 * Note:
 * - No additional database lookup is performed here because the RBAC
 *   middleware has already resolved the application user.
 * - Returns null when the database user is missing so the controller
 *   can respond with HTTP 401.
 */
const getUserId = (req: Request): string | null => {
  return req.dbUser?.id ?? null;
};

export class CartController {
  /**
   * Retrieves the authenticated user's active cart.
   *
   * Expects:
   * - req.dbUser: The authenticated database user populated by RBAC middleware.
   *
   * Does:
   * - Reads the authenticated user's database ID from req.dbUser.
   * - Calls CartService.getActiveCart to retrieve the user's active cart
   *   and its associated cart items.
   * - CartService creates a new active cart if the user does not already
   *   have one.
   *
   * Sends:
   * - 200 with a success message and the active cart on success.
   * - 401 with a safe message if the authenticated database user is missing.
   * - 500 with a safe error message if the cart cannot be retrieved.
   *
   * Route:
   * - GET /api/cart
   */
  static async getActiveCart(req: Request, res: Response) {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: 'יש להתחבר למערכת כדי לצפות בעגלת הקניות.',
      });
    }

    try {
      const cart = await CartService.getActiveCart(userId);

      return res.status(200).json({
        message: 'Cart retrieved successfully',
        cart,
      });
    } catch (error) {
      logger.error('Error fetching active cart:', { error });

      return res.status(500).json({
        error: 'לא ניתן לטעון את עגלת הקניות כרגע. אנא נסה שוב.',
      });
    }
  }

  /**
   * Adds a new item to the authenticated user's active cart.
   *
   * Expects:
   * - req.dbUser: The authenticated database user populated by RBAC middleware.
   * - req.body: The cart item data required by CartService.addItemToCart,
   *   including the product ID, quantity, selected attributes, and optional
   *   uploaded file path.
   *
   * Does:
   * - Reads the authenticated user's database ID from req.dbUser.
   * - Passes the user ID and submitted item data to CartService.
   * - CartService retrieves or creates the user's active cart.
   * - CartService recalculates the item's authoritative price and stores
   *   the new cart item.
   *
   * Sends:
   * - 201 with a success message and the newly created cart item.
   * - 401 with a safe message if the authenticated database user is missing.
   * - 500 with a safe error message if the item cannot be added.
   *
   * Route:
   * - POST /api/cart/items
   */
  static async addItem(req: Request, res: Response) {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: 'יש להתחבר למערכת כדי להוסיף פריטים לעגלה.',
      });
    }

    try {
      const itemData = req.body;

      const newItem = await CartService.addItemToCart(userId, itemData);

      return res.status(201).json({
        message: 'Item added successfully',
        item: newItem,
      });
    } catch (error) {
      logger.error('Error adding item to cart:', { error });

      return res.status(500).json({
        error: 'לא ניתן להוסיף את הפריט לעגלה כרגע. אנא נסה שוב.',
      });
    }
  }

  /**
   * Removes a specific item from the authenticated user's active cart.
   *
   * Expects:
   * - req.dbUser: The authenticated database user populated by RBAC middleware.
   * - req.params.id: ID of the cart item that should be removed.
   *
   * Does:
   * - Reads the authenticated user's database ID from req.dbUser.
   * - Passes both the user ID and cart item ID to CartService.removeItem.
   * - CartService verifies that the item belongs to the user's active cart.
   * - CartService soft-deletes the item by setting isDeleted to true.
   *
   * Sends:
   * - 200 with a success message after the item is removed.
   * - 401 with a safe message if the authenticated database user is missing.
   * - 500 with a safe error message if the item cannot be removed.
   *
   * Route:
   * - DELETE /api/cart/items/:id
   */
  static async removeItem(req: Request, res: Response) {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: 'יש להתחבר למערכת כדי להסיר פריטים מהעגלה.',
      });
    }

    try {
      const { id } = req.params;

      await CartService.removeItem(userId, id);

      return res.status(200).json({
        message: `Item ${id} removed successfully`,
      });
    } catch (error) {
      logger.error(`Error removing item ${req.params.id}:`, { error });

      return res.status(500).json({
        error: 'לא ניתן להסיר את הפריט מהעגלה כרגע. אנא נסה שוב.',
      });
    }
  }

  /**
   * Updates an existing item in the authenticated user's active cart.
   *
   * Expects:
   * - req.dbUser: The authenticated database user populated by RBAC middleware.
   * - req.params.id: ID of the cart item that should be updated.
   * - req.body: The cart item fields to update, such as quantity or
   *   selected product attributes.
   *
   * Does:
   * - Reads the authenticated user's database ID from req.dbUser.
   * - Passes the user ID, cart item ID, and submitted changes to CartService.
   * - CartService verifies that the item belongs to the user's active cart.
   * - CartService recalculates the item's authoritative price using the
   *   updated quantity and product configuration.
   * - Stores the updated cart item in the database.
   *
   * Sends:
   * - 200 with a success message and the updated cart item.
   * - 401 with a safe message if the authenticated database user is missing.
   * - 500 with a safe error message if the item cannot be updated.
   *
   * Route:
   * - PATCH /api/cart/items/:id
   */
  static async updateItem(req: Request, res: Response) {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: 'יש להתחבר למערכת כדי לעדכן פריטים בעגלה.',
      });
    }

    try {
      const { id } = req.params;
      const itemData = req.body;

      const updatedItem = await CartService.updateItem(userId, id, itemData);

      return res.status(200).json({
        message: 'Item updated successfully',
        item: updatedItem,
      });
    } catch (error) {
      logger.error(`Error updating item ${req.params.id}:`, { error });

      return res.status(500).json({
        error: 'לא ניתן לעדכן את הפריט בעגלה כרגע. אנא נסה שוב.',
      });
    }
  }

  /**
   * Removes all items from the authenticated user's active cart.
   *
   * Expects:
   * - req.dbUser: The authenticated database user populated by RBAC middleware.
   *
   * Does:
   * - Reads the authenticated user's database ID from req.dbUser.
   * - Calls CartService.clearCart for that user.
   * - CartService soft-deletes all non-deleted items in the user's active cart.
   *
   * Sends:
   * - 200 with a success message after the cart is cleared.
   * - 401 with a safe message if the authenticated database user is missing.
   * - 500 with a safe error message if the cart cannot be cleared.
   *
   * Route:
   * - DELETE /api/cart/items
   */
  static async clearCart(req: Request, res: Response) {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        error: 'יש להתחבר למערכת כדי לרוקן את עגלת הקניות.',
      });
    }

    try {
      await CartService.clearCart(userId);

      return res.status(200).json({
        message: 'Cart cleared successfully',
      });
    } catch (error) {
      logger.error('Error clearing cart:', { error });

      return res.status(500).json({
        error: 'לא ניתן לרוקן את עגלת הקניות כרגע. אנא נסה שוב.',
      });
    }
  }
}
