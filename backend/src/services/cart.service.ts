import { prisma } from '../config/db';
import { Status, Prisma } from '@prisma/client';
import { PricingEngineService } from './pricing-engine.service';

import type { AddToCartInput, UpdateCartItemInput } from 'shared-types';

export class CartService {
  /**
   * Fetch the active cart for the user,
   * or create a new one if it doesn't exist.
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
   * Add a product to the active cart and calculate its price.
   */
  static async addItemToCart(userId: string, input: AddToCartInput) {
    const cart = await this.getActiveCart(userId);

    /**
     * Always calculate the authoritative price on the server.
     */
    const priceResult = await PricingEngineService.calculatePrice({
      productId: input.productId,
      quantity: input.quantity,
      selectedAttributes: input.selectedAttributes,
    });

    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: input.productId,

        /**
         * Quantity is first-class cart-item data,
         * not part of selectedAttributes.
         */
        quantity: input.quantity,

        computedPrice: priceResult.totalPrice,

        /**
         * selectedAttributes contains only the
         * dynamic product configuration.
         */
        selectedAttributes: input.selectedAttributes as unknown as Prisma.InputJsonValue,

        uploadedFilePath: input.uploadedFilePath ?? '',
      },
    });
  }

  /**
   * Update an existing cart item
   * and recalculate its price.
   */
  static async updateItem(cartItemId: string, input: UpdateCartItemInput) {
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        isDeleted: false,
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
   * Soft-delete an item from the cart.
   */
  static async removeItem(cartItemId: string) {
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        isDeleted: false,
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
   * Clears the active cart by soft-deleting all its items.
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
