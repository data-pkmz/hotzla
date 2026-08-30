/// <reference types="jest" />
import { OrderStatus, Role, Status, ChangeSource } from '@prisma/client';
import { prisma } from '../../config/db';
import { OrderService } from '../order.service';
import { PricingEngineService } from '../pricing-engine.service';
import { OrderNumberGenerator } from '../../utils/order-number-generator';

jest.mock('../../config/db', () => ({
  prisma: {
    $transaction: jest.fn((callback) => callback(prisma)),
    user: {
      findFirst: jest.fn(),
    },
    cart: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../pricing-engine.service', () => ({
  PricingEngineService: {
    calculatePrice: jest.fn(),
  },
}));

jest.mock('../../utils/order-number-generator', () => ({
  OrderNumberGenerator: {
    generateNextOrderNumber: jest.fn(),
  },
}));

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrderFromCart', () => {
    const validUserId = 'user-123';
    const validInput = {
      budgetOfficerName: 'רסן ישראל ישראלי',
      budgetOfficerEmail: 'budget.officer@idf.il',
      unit: 'מודיעין',
      notes: 'נא להדפיס בדחיפות',
    };

    it('should successfully create an order from active cart and convert the cart', async () => {
      const mockUser = {
        id: validUserId,
        fullName: 'ישראל ישראלי',
        unit: 'מודיעין',
        isDeleted: false,
      };

      const mockCart = {
        id: 'cart-1',
        userId: validUserId,
        status: Status.ACTIVE,
        cartItemEntries: [
          {
            id: 'cart-item-1',
            productId: 'prod-1',
            quantity: 10,
            uploadedFilePath: '/uploads/doc.pdf',
            selectedAttributes: [
              {
                attributeDefinitionId: 'attr-1',
                selectedOptionIds: ['opt-1'],
                value: 'A4',
              },
            ],
            isDeleted: false,
          },
        ],
      };

      const mockPriceResult = {
        totalPrice: 150,
      };

      const mockOrderNumber = '2026-0001';

      const mockCreatedOrder = {
        id: 'order-1',
        orderNumber: mockOrderNumber,
        requesterId: validUserId,
        status: OrderStatus.PENDING_BUDGET,
        budgetOfficerName: validInput.budgetOfficerName,
        budgetOfficerEmail: validInput.budgetOfficerEmail,
        totalPrice: 150,
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(mockCart);
      (PricingEngineService.calculatePrice as jest.Mock).mockResolvedValue(mockPriceResult);
      (OrderNumberGenerator.generateNextOrderNumber as jest.Mock).mockResolvedValue(
        mockOrderNumber
      );
      (prisma.order.create as jest.Mock).mockResolvedValue(mockCreatedOrder);
      (prisma.orderStatusHistory.create as jest.Mock).mockResolvedValue({ id: 'history-1' });
      (prisma.cart.update as jest.Mock).mockResolvedValue({
        ...mockCart,
        status: Status.CONVERTED,
      });

      const result = await OrderService.createOrderFromCart(validUserId, validInput);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: validUserId, isDeleted: false },
      });
      expect(prisma.cart.findFirst).toHaveBeenCalledWith({
        where: { userId: validUserId, status: Status.ACTIVE, isDeleted: false },
        include: {
          cartItemEntries: {
            where: { isDeleted: false },
          },
        },
      });
      expect(PricingEngineService.calculatePrice).toHaveBeenCalledWith({
        productId: 'prod-1',
        quantity: 10,
        selectedAttributes: mockCart.cartItemEntries[0].selectedAttributes,
      });
      expect(OrderNumberGenerator.generateNextOrderNumber).toHaveBeenCalled();
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderNumber: mockOrderNumber,
            requesterId: validUserId,
            status: OrderStatus.PENDING_BUDGET,
            budgetOfficerName: validInput.budgetOfficerName,
            budgetOfficerEmail: validInput.budgetOfficerEmail,
          }),
        })
      );
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: mockCreatedOrder.id,
          toStatus: OrderStatus.PENDING_BUDGET,
          changedByUserId: validUserId,
          changedBySource: ChangeSource.SYSTEM,
        }),
      });
      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCart.id },
          data: expect.objectContaining({ status: Status.CONVERTED }),
        })
      );
      expect(result).toEqual(mockCreatedOrder);
    });

    it('should throw error if budgetOfficerName is missing', async () => {
      await expect(
        OrderService.createOrderFromCart(validUserId, {
          ...validInput,
          budgetOfficerName: '',
        })
      ).rejects.toThrow('שם קצין תקציב הוא שדה חובה');
    });

    it('should throw error if budgetOfficerEmail is invalid', async () => {
      await expect(
        OrderService.createOrderFromCart(validUserId, {
          ...validInput,
          budgetOfficerEmail: 'not-an-email',
        })
      ).rejects.toThrow('כתובת מייל קצין תקציב אינה תקינה');
    });

    it('should throw error if user is not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(OrderService.createOrderFromCart(validUserId, validInput)).rejects.toThrow(
        'המשתמש לא נמצא'
      );
    });

    it('should throw error if active cart is empty', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: validUserId });
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue({
        id: 'cart-1',
        cartItemEntries: [],
      });

      await expect(OrderService.createOrderFromCart(validUserId, validInput)).rejects.toThrow(
        'לא נמצאה עגלת קניות פעילה עם פריטים'
      );
    });
  });

  describe('getOrderById', () => {
    it('should allow requester to view their own order', async () => {
      const mockOrder = {
        id: 'order-1',
        requesterId: 'user-1',
        orderNumber: '2026-0001',
      };
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);

      const result = await OrderService.getOrderById('order-1', {
        id: 'user-1',
        role: Role.REQUESTER,
      });

      expect(result).toEqual(mockOrder);
    });

    it('should forbid requester from viewing another user order', async () => {
      const mockOrder = {
        id: 'order-1',
        requesterId: 'user-2',
        orderNumber: '2026-0001',
      };
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);

      await expect(
        OrderService.getOrderById('order-1', { id: 'user-1', role: Role.REQUESTER })
      ).rejects.toThrow('אין לך הרשאה לצפות בהזמנה זו');
    });

    it('should allow manager to view any order', async () => {
      const mockOrder = {
        id: 'order-1',
        requesterId: 'user-2',
        orderNumber: '2026-0001',
      };
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);

      const result = await OrderService.getOrderById('order-1', {
        id: 'manager-1',
        role: Role.MANAGER,
      });

      expect(result).toEqual(mockOrder);
    });

    it('should throw error if order is not found', async () => {
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        OrderService.getOrderById('order-999', { id: 'user-1', role: Role.REQUESTER })
      ).rejects.toThrow('ההזמנה לא נמצאה');
    });
  });

  describe('getOrders', () => {
    it('should filter by requesterId for REQUESTER role', async () => {
      const mockOrders = [{ id: 'order-1', orderNumber: '2026-0001' }];
      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);
      (prisma.order.count as jest.Mock).mockResolvedValue(1);

      const result = await OrderService.getOrders(
        { id: 'user-1', role: Role.REQUESTER },
        { page: 1, limit: 10 }
      );

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ requesterId: 'user-1', isDeleted: false }),
        })
      );
      expect(result.orders).toEqual(mockOrders);
      expect(result.total).toBe(1);
    });

    it('should allow manager to query all orders with search', async () => {
      const mockOrders = [{ id: 'order-1', orderNumber: '2026-0001' }];
      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);
      (prisma.order.count as jest.Mock).mockResolvedValue(1);

      const result = await OrderService.getOrders(
        { id: 'manager-1', role: Role.MANAGER },
        { search: '2026', status: OrderStatus.PENDING_BUDGET }
      );

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.PENDING_BUDGET,
            OR: expect.any(Array),
            isDeleted: false,
          }),
        })
      );
      expect(result.total).toBe(1);
    });
  });
});
