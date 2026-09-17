import { prisma } from '../config/db';
import { Status, Prisma } from '@prisma/client';
import { PricingEngineService } from './pricing-engine.service';

import type { AddToCartInput, UpdateCartItemInput } from 'shared-types';

export class CartService {
  /**
   * Retrieves the user's active cart or creates one when none exists.
   *
   * Expects:
   * - userId: Database ID of the user whose cart should be retrieved.
   *
   * Does:
   * - Searches for a non-deleted cart with ACTIVE status belonging to the user.
   * - Loads all non-deleted cart items belonging to the active cart.
   * - Loads each cart item's product and available product attributes/options.
   * - Creates a new ACTIVE cart when the user does not currently have one.
   *
   * Returns:
   * - The user's existing active cart when one exists.
   * - A newly created active cart when none exists.
   */
  static async getActiveCart(userId: string) {
    const existingCart = await prisma.cart.findFirst({
      where: {
        userId,
        status: Status.ACTIVE,
        isDeleted: false,
      },
      include: {
        cartItemEntries: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            id: 'asc',
          },
          include: {
            product: {
              include: {
                attributeDefinitionEntries: {
                  where: {
                    isDeleted: false,
                  },
                  include: {
                    attributeOptionEntries: {
                      where: {
                        isDeleted: false,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (existingCart) {
      return existingCart;
    }

    return prisma.cart.create({
      data: {
        userId,
        status: Status.ACTIVE,
        updatedAt: new Date(),
      },
      include: {
        cartItemEntries: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            id: 'asc',
          },
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Adds a configured product to the user's active cart.
   *
   * Expects:
   * - userId: Database ID of the user adding the item.
   * - input.productId: ID of the selected product.
   * - input.quantity: Quantity requested by the user.
   * - input.selectedAttributes: Dynamic product configuration selected by the user.
   * - input.uploadedFilePath: Optional path of an uploaded file associated
   *   with the cart item.
   *
   * Does:
   * - Retrieves or creates the user's active cart.
   * - Recalculates the item's price on the server using PricingEngineService.
   * - Stores the quantity separately from the dynamic product attributes.
   * - Stores the selected dynamic attributes as JSON.
   * - Stores the authoritative calculated price rather than trusting a
   *   client-provided price.
   *
   * Returns:
   * - The newly created cart item.
   *
   * Throws:
   * - Any error produced while retrieving the cart, calculating the price,
   *   or creating the cart item.
   */
  static async addItemToCart(userId: string, input: AddToCartInput) {
    const cart = await this.getActiveCart(userId);

    // Recalculate the authoritative price on the server instead of trusting
    // price information supplied by the frontend.
    const priceResult = await PricingEngineService.calculatePrice({
      productId: input.productId,
      quantity: input.quantity,
      selectedAttributes: input.selectedAttributes,
    });

    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: input.productId,

        // Quantity is first-class cart item data rather than a dynamic attribute.
        quantity: input.quantity,

        computedPrice: priceResult.totalPrice,

        // selectedAttributes contains only the product's dynamic configuration.
        selectedAttributes: input.selectedAttributes as unknown as Prisma.InputJsonValue,

        uploadedFilePath: input.uploadedFilePath ?? '',
      },
    });
  }

  /**
   * Updates an existing cart item belonging to the authenticated user and
   * recalculates its price.
   *
   * Expects:
   * - userId: Database ID of the user who owns the cart item.
   * - cartItemId: ID of the cart item that should be updated.
   * - input.quantity: Optional replacement quantity.
   * - input.selectedAttributes: Optional replacement product configuration.
   *
   * Does:
   * - Finds the non-deleted cart item and verifies that it belongs to the
   *   user's active cart.
   * - Keeps the existing quantity or attributes when replacements are not provided.
   * - Recalculates the item's authoritative price using the resulting configuration.
   * - Updates the cart item in the database.
   *
   * Returns:
   * - The updated cart item.
   *
   * Throws:
   * - "Cart item not found" if the item does not exist, has been deleted,
   *   or does not belong to the user's active cart.
   * - Any error produced while recalculating or updating the item.
   */
  static async updateItem(userId: string, cartItemId: string, input: UpdateCartItemInput) {
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        isDeleted: false,
        cart: {
          userId,
          status: Status.ACTIVE,
          isDeleted: false,
        },
      },
    });

    if (!existingItem) {
      throw new Error('Cart item not found');
    }

    const quantity = input.quantity ?? Number(existingItem.quantity);

    const selectedAttributes =
      input.selectedAttributes ??
      (existingItem.selectedAttributes as unknown as UpdateCartItemInput['selectedAttributes']);

    const priceResult = await PricingEngineService.calculatePrice({
      productId: existingItem.productId,
      quantity,
      selectedAttributes: selectedAttributes ?? [],
    });

    return prisma.cartItem.update({
      where: {
        id: cartItemId,
      },
      data: {
        quantity: input.quantity,
        selectedAttributes: selectedAttributes as unknown as Prisma.InputJsonValue,
        computedPrice: priceResult.totalPrice,
      },
    });
  }

  /**
   * Soft-deletes a cart item belonging to the authenticated user.
   *
   * Expects:
   * - userId: Database ID of the user who owns the cart item.
   * - cartItemId: ID of the cart item that should be removed.
   *
   * Does:
   * - Finds the non-deleted cart item and verifies that it belongs to the
   *   user's active cart.
   * - Marks the item as deleted instead of physically removing it.
   *
   * Returns:
   * - The updated cart item with isDeleted set to true.
   *
   * Throws:
   * - "Cart item not found" if the item does not exist, has already been
   *   deleted, or does not belong to the user's active cart.
   */
  static async removeItem(userId: string, cartItemId: string) {
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        isDeleted: false,
        cart: {
          userId,
          status: Status.ACTIVE,
          isDeleted: false,
        },
      },
    });

    if (!existingItem) {
      throw new Error('Cart item not found');
    }

    return prisma.cartItem.update({
      where: {
        id: cartItemId,
      },
      data: {
        isDeleted: true,
      },
    });
  }

  /**
   * Clears all items from the user's active cart.
   *
   * Expects:
   * - userId: Database ID of the user whose cart should be cleared.
   *
   * Does:
   * - Retrieves or creates the user's active cart.
   * - Soft-deletes every non-deleted item currently belonging to that cart.
   *
   * Returns:
   * - Prisma's updateMany result containing the number of cart items updated.
   */
  static async clearCart(userId: string) {
    const activeCart = await this.getActiveCart(userId);

    return prisma.cartItem.updateMany({
      where: {
        cartId: activeCart.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });
  }
}
