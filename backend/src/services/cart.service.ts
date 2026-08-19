import { prisma } from '../config/db.js';
import { Status, Prisma } from '@prisma/client';
import { PricingEngineService } from './pricing-engine-service.js';
import type { AddToCartInput, UpdateCartItemInput, CartItemAttributesJson } from 'shared-types';

export class CartService {
  /**
   * Fetch the active cart for the user, or create a new one if it doesn't exist.
   */
  static async getActiveCart(userId: string) {
    const existingCart = await prisma.cart.findFirst({
      where: {
        userId: userId,
        status: Status.ACTIVE,
        isDeleted: false,
      },
      include: {
        cartItemEntries: true,
      },
    });

    if (existingCart) {
      return existingCart;
    }

    const newCart = await prisma.cart.create({
      data: {
        userId: userId,
        status: Status.ACTIVE,
        updatedAt: new Date(),
      },
      include: {
        cartItemEntries: true,
      },
    });

    return newCart;
  }

  /**
   * Add a product to the active cart and calculate its price.
   */
  static async addItemToCart(userId: string, input: AddToCartInput) {
    const cart = await this.getActiveCart(userId);

    // Calculate the real price using the Pricing Engine
    // Don't forget the 'await' since it returns a Promise!
    const priceResult = await PricingEngineService.calculatePrice({
      productId: input.productId,
      quantity: input.quantity,
      selectedAttributes: input.selectedAttributes,
    });

    // We store quantity inside the JSON so we don't lose it,
    // since there is no 'quantity' column in the CartItem table.
    const jsonToSave: CartItemAttributesJson = {
      quantity: input.quantity,
      attributes: input.selectedAttributes,
    };

    // Add the item to the database
    const newItem = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: input.productId,
        computedPrice: priceResult.totalPrice,
        selectedAttributes: jsonToSave as unknown as Prisma.InputJsonValue,
        uploadedFilePath: input.uploadedFilePath || '',
      },
    });

    return newItem;
  }

  /**
   * Update an existing cart item (change attributes/quantity) and recalculate price.
   */
  static async updateItem(cartItemId: string, input: UpdateCartItemInput) {
    // Get the existing item to find the productId
    const existingItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!existingItem) throw new Error('Cart item not found');

    // Recalculate price with new attributes and quantity
    const priceResult = await PricingEngineService.calculatePrice({
      productId: existingItem.productId,
      quantity: input.quantity,
      selectedAttributes: input.selectedAttributes,
    });

    const jsonToSave: CartItemAttributesJson = {
      quantity: input.quantity,
      attributes: input.selectedAttributes,
    };

    // Update the database
    const updatedItem = await prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        selectedAttributes: jsonToSave as unknown as Prisma.InputJsonValue,
        computedPrice: priceResult.totalPrice,
      },
    });

    return updatedItem;
  }

  /**
   * Remove an item from the cart.
   */
  static async removeItem(cartItemId: string) {
    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });
  }

  /**
   * Clear the active cart after a successful order.
   */
  static async clearCart(userId: string) {
    await prisma.cart.updateMany({
      where: {
        userId: userId,
        status: Status.ACTIVE,
      },
      data: {
        status: Status.CONVERTED,
      },
    });
  }
}
