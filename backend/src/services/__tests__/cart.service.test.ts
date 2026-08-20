/// <reference types="jest" />
import { Status } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { CartService } from '../cart.service.js';
import { PricingEngineService } from '../pricing-engine.service.js';
import type { AddToCartInput } from 'shared-types';

// 1. Mocking Prisma and our internal services
jest.mock('../../config/db.js', () => ({
  prisma: {
    cart: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    cartItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../pricing-engine.service.js', () => ({
  PricingEngineService: {
    calculatePrice: jest.fn(),
  },
}));

describe('CartService', () => {
  afterEach(() => {
    jest.clearAllMocks(); // Always clean up between tests
  });

  describe('getActiveCart', () => {
    it('should return the existing active cart if one exists', async () => {
      // Arrange
      const mockCart = { id: 'cart-1', userId: 'user-1', status: Status.ACTIVE };
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(mockCart);

      // Act
      const result = await CartService.getActiveCart('user-1');

      // Assert
      expect(prisma.cart.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', status: Status.ACTIVE, isDeleted: false },
        })
      );
      expect(prisma.cart.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockCart);
    });

    it('should create a new active cart if none exists', async () => {
      // Arrange
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(null);
      const mockNewCart = { id: 'cart-2', userId: 'user-2', status: Status.ACTIVE };
      (prisma.cart.create as jest.Mock).mockResolvedValue(mockNewCart);

      // Act
      const result = await CartService.getActiveCart('user-2');

      // Assert
      expect(prisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-2', status: Status.ACTIVE }),
        })
      );
      expect(result).toEqual(mockNewCart);
    });
  });

  describe('addItemToCart', () => {
    it('should correctly calculate the price and save the item in JSONB format', async () => {
      // Arrange
      const mockCart = { id: 'cart-1', userId: 'user-1', status: Status.ACTIVE };
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(mockCart);

      const mockPriceResult = { totalPrice: 150.5 };
      (PricingEngineService.calculatePrice as jest.Mock).mockResolvedValue(mockPriceResult);

      const mockCreatedItem = { id: 'item-1', computedPrice: 150.5 };
      (prisma.cartItem.create as jest.Mock).mockResolvedValue(mockCreatedItem);

      const input: AddToCartInput = {
        productId: 'prod-1',
        quantity: 5,
        selectedAttributes: [{ attributeDefinitionId: 'attr-1', value: 'Red' }],
      };

      // Act
      const result = await CartService.addItemToCart('user-1', input);

      // Assert
      // 1. Verify pricing engine was called with correct data
      expect(PricingEngineService.calculatePrice).toHaveBeenCalledWith({
        productId: 'prod-1',
        quantity: 5,
        selectedAttributes: input.selectedAttributes,
      });

      // 2. Verify database create was called with correct structure (JSON & Price)
      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cartId: 'cart-1',
          productId: 'prod-1',
          quantity: 5,
          computedPrice: 150.5,
          selectedAttributes: input.selectedAttributes,
          uploadedFilePath: '',
        }),
      });

      expect(result).toEqual(mockCreatedItem);
    });

    it('should throw an error if the PricingEngineService fails (e.g. product not found)', async () => {
      // Arrange: Force PricingEngineService to simulate a product not found error
      (PricingEngineService.calculatePrice as jest.Mock).mockRejectedValue(
        new Error('Product not found')
      );

      const input: AddToCartInput = {
        productId: 'bad-product-id',
        quantity: 1,
        selectedAttributes: [],
      };

      // Act & Assert: The function MUST crash with the exact error message
      await expect(CartService.addItemToCart('user-1', input)).rejects.toThrow('Product not found');

      // Verify that the database was NEVER called to save the item
      expect(prisma.cartItem.create).not.toHaveBeenCalled();
    });
  });

  describe('updateItem', () => {
    it('should throw an error if the cart item is not found in the database', async () => {
      // Arrange: Force Prisma to return null when searching for the item
      (prisma.cartItem.findFirst as jest.Mock).mockResolvedValue(null);

      const input = { quantity: 2, selectedAttributes: [] };

      // Act & Assert
      await expect(CartService.updateItem('fake-item-id', input)).rejects.toThrow(
        'Cart item not found'
      );

      // Verify we didn't try to calculate a price or update the database
      expect(PricingEngineService.calculatePrice).not.toHaveBeenCalled();
      expect(prisma.cartItem.update).not.toHaveBeenCalled();
    });
  });
});
