import { Request, Response } from 'express';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import logger from '../utils/logger';

const authService = new AuthService();

// Helper to get the real user ID from the database using the AD username
const getUserId = async (req: Request) => {
  const adUsername = req.user?.adUsername;
  if (!adUsername) throw new Error('Unauthorized');

  const user = await authService.getOrCreateUser(adUsername);
  return user.id;
};

export class CartController {
  // GET /api/cart - Fetch the user's active cart
  static async getActiveCart(req: Request, res: Response) {
    try {
      const userId = await getUserId(req);
      const cart = await CartService.getActiveCart(userId);
      return res.status(200).json({ message: 'Cart retrieved successfully', cart });
    } catch (error) {
      logger.error('Error fetching active cart:', { error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: errorMessage });
    }
  }

  // POST /api/cart/items - Add an item to the cart
  static async addItem(req: Request, res: Response) {
    try {
      const userId = await getUserId(req);
      const itemData = req.body;
      const newItem = await CartService.addItemToCart(userId, itemData);
      return res.status(201).json({ message: 'Item added successfully', item: newItem });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error adding item to cart:', errorMessage);
      return res.status(500).json({ error: errorMessage });
    }
  }

  // DELETE /api/cart/items/:id - Remove an item
  static async removeItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await CartService.removeItem(id);
      return res.status(200).json({ message: `Item ${id} removed successfully` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error removing item ${req.params.id}:`, errorMessage);
      return res.status(500).json({ error: errorMessage });
    }
  }

  // PATCH /api/cart/items/:id - Update an item (e.g., quantity)
  static async updateItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const itemData = req.body;
      const updatedItem = await CartService.updateItem(id, itemData);
      return res.status(200).json({ message: 'Item updated successfully', item: updatedItem });
    } catch (error) {
      logger.error(`Error updating item ${req.params.id}:`, { error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: errorMessage });
    }
  }
}
