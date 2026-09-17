import { Request, Response } from 'express';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import logger from '../utils/logger';

const authService = new AuthService();

/**
 * Resolves the authenticated application's database user ID from the
 * Active Directory username stored on the request.
 *
 * Expects:
 * - req.user.adUsername: The authenticated user's AD username, populated
 *   by authMiddleware before this helper is called.
 *
 * Does:
 * - Reads the AD username from req.user.
 * - Throws an "Unauthorized" error if no authenticated username is available.
 * - Calls AuthService.getOrCreateUser to retrieve the corresponding database
 *   user, creating one if necessary.
 *
 * Returns:
 * - The database ID of the authenticated user.
 *
 * Throws:
 * - An Error with message "Unauthorized" when req.user.adUsername is missing.
 * - Any error produced while retrieving or creating the database user.
 */
const getUserId = async (req: Request) => {
  const adUsername = req.user?.adUsername;

  if (!adUsername) {
    throw new Error('Unauthorized');
  }

  const user = await authService.getOrCreateUser(adUsername);

  return user.id;
};

export class CartController {
  /**
   * Retrieves the authenticated user's active cart.
   *
   * Expects:
   * - req.user.adUsername: The authenticated user's AD username.
   *
   * Does:
   * - Resolves the authenticated user's database ID.
   * - Calls CartService.getActiveCart to retrieve the user's active cart
   *   and its associated cart items.
   * - CartService creates a new active cart if the user does not already
   *   have one.
   *
   * Sends:
   * - 200 with a success message and the active cart on success.
   * - 500 with an error message if the user cannot be resolved or the cart
   *   cannot be retrieved.
   *
   * Route:
   * - GET /api/cart
   */
  static async getActiveCart(req: Request, res: Response) {
    try {
      const userId = await getUserId(req);
      const cart = await CartService.getActiveCart(userId);

      return res.status(200).json({
        message: 'Cart retrieved successfully',
        cart,
      });
    } catch (error) {
      logger.error('Error fetching active cart:', { error });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }

  /**
   * Adds a new item to the authenticated user's active cart.
   *
   * Expects:
   * - req.user.adUsername: The authenticated user's AD username.
   * - req.body: The cart item data required by CartService.addItemToCart,
   *   including the product ID, quantity, selected attributes, and optional
   *   uploaded file path.
   *
   * Does:
   * - Resolves the authenticated user's database ID.
   * - Passes the user ID and submitted item data to CartService.
   * - CartService retrieves or creates the user's active cart.
   * - CartService recalculates the item's authoritative price and stores
   *   the new cart item.
   *
   * Sends:
   * - 201 with a success message and the newly created cart item.
   * - 500 with an error message if the item cannot be added.
   *
   * Route:
   * - POST /api/cart/items
   */
  static async addItem(req: Request, res: Response) {
    try {
      const userId = await getUserId(req);
      const itemData = req.body;

      const newItem = await CartService.addItemToCart(userId, itemData);

      return res.status(201).json({
        message: 'Item added successfully',
        item: newItem,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error adding item to cart:', { error });

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }

  /**
   * Removes a specific item from the authenticated user's active cart.
   *
   * Expects:
   * - req.user.adUsername: The authenticated user's AD username.
   * - req.params.id: ID of the cart item that should be removed.
   *
   * Does:
   * - Resolves the authenticated user's database ID.
   * - Passes both the user ID and cart item ID to CartService.removeItem.
   * - CartService verifies that the item belongs to the user's active cart.
   * - CartService soft-deletes the item by setting isDeleted to true.
   *
   * Sends:
   * - 200 with a success message after the item is removed.
   * - 500 with an error message if the item does not exist, does not belong
   *   to the authenticated user, or cannot be removed.
   *
   * Route:
   * - DELETE /api/cart/items/:id
   */
  static async removeItem(req: Request, res: Response) {
    try {
      const userId = await getUserId(req);
      const { id } = req.params;

      await CartService.removeItem(userId, id);

      return res.status(200).json({
        message: `Item ${id} removed successfully`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Error removing item ${req.params.id}:`, { error });

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }

  /**
   * Updates an existing item in the authenticated user's active cart.
   *
   * Expects:
   * - req.user.adUsername: The authenticated user's AD username.
   * - req.params.id: ID of the cart item that should be updated.
   * - req.body: The cart item fields to update, such as quantity or
   *   selected product attributes.
   *
   * Does:
   * - Resolves the authenticated user's database ID.
   * - Passes the user ID, cart item ID, and submitted changes to CartService.
   * - CartService verifies that the item belongs to the user's active cart.
   * - CartService recalculates the item's authoritative price using the
   *   updated quantity and product configuration.
   * - Stores the updated cart item in the database.
   *
   * Sends:
   * - 200 with a success message and the updated cart item.
   * - 500 with an error message if the item does not exist, does not belong
   *   to the authenticated user, or cannot be updated.
   *
   * Route:
   * - PATCH /api/cart/items/:id
   */
  static async updateItem(req: Request, res: Response) {
    try {
      const userId = await getUserId(req);
      const { id } = req.params;
      const itemData = req.body;

      const updatedItem = await CartService.updateItem(userId, id, itemData);

      return res.status(200).json({
        message: 'Item updated successfully',
        item: updatedItem,
      });
    } catch (error) {
      logger.error(`Error updating item ${req.params.id}:`, { error });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }

  /**
   * Removes all items from the authenticated user's active cart.
   *
   * Expects:
   * - req.user.adUsername: The authenticated user's AD username.
   *
   * Does:
   * - Resolves the authenticated user's database ID.
   * - Calls CartService.clearCart for that user.
   * - CartService soft-deletes all non-deleted items in the user's active cart.
   *
   * Sends:
   * - 200 with a success message after the cart is cleared.
   * - 500 with an error message if the user cannot be resolved or the cart
   *   cannot be cleared.
   *
   * Route:
   * - DELETE /api/cart/items
   */
  static async clearCart(req: Request, res: Response) {
    try {
      const userId = await getUserId(req);

      await CartService.clearCart(userId);

      return res.status(200).json({
        message: 'Cart cleared successfully',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error clearing cart:', { error });

      return res.status(500).json({
        error: errorMessage,
      });
    }
  }
}
