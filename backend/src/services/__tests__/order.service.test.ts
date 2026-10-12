/// <reference types="jest" />

import { ChangeSource, NotificationJobType, OrderStatus, Role, Status } from '@prisma/client';

import { prisma } from '../../config/db';
import { OrderNumberGenerator } from '../../utils/order-number-generator';
import { OrderService } from '../order.service';
import { PricingEngineService } from '../pricing-engine.service';

jest.mock('../../config/db', () => ({
  prisma: {
    $transaction: jest.fn((callback) => callback(prisma)),

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

/**
 * Suppress normal application logging during unit tests.
 *
 * AuditLogService is intentionally not mocked so that the order-service
 * tests still verify creation of the initial OrderStatusHistory record.
 */
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
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
        unit: validInput.unit,
        status: OrderStatus.PENDING_BUDGET,
        budgetOfficerName: validInput.budgetOfficerName,
        budgetOfficerEmail: validInput.budgetOfficerEmail,
        totalPrice: 150,
      };

      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(mockCart);

      (PricingEngineService.calculatePrice as jest.Mock).mockResolvedValue(mockPriceResult);

      (OrderNumberGenerator.generateNextOrderNumber as jest.Mock).mockResolvedValue(
        mockOrderNumber
      );

      (prisma.order.create as jest.Mock).mockResolvedValue(mockCreatedOrder);

      (prisma.orderStatusHistory.create as jest.Mock).mockResolvedValue({
        id: 'history-1',
      });

      (prisma.cart.update as jest.Mock).mockResolvedValue({
        ...mockCart,
        status: Status.CONVERTED,
      });

      const result = await OrderService.createOrderFromCart(validUserId, validInput);

      /**
       * The service should load the user's active cart directly.
       * User validation is handled before OrderService is called,
       * so there is no redundant prisma.user lookup here.
       */
      expect(prisma.cart.findFirst).toHaveBeenCalledWith({
        where: {
          userId: validUserId,
          status: Status.ACTIVE,
          isDeleted: false,
        },
        include: {
          cartItemEntries: {
            where: {
              isDeleted: false,
            },
          },
        },
      });

      /**
       * Pricing is performed inside the checkout transaction.
       * Therefore the transaction client is passed as the second
       * argument to PricingEngineService.
       */
      expect(PricingEngineService.calculatePrice).toHaveBeenCalledWith(
        {
          productId: 'prod-1',
          quantity: 10,
          selectedAttributes: mockCart.cartItemEntries[0].selectedAttributes,
        },
        prisma
      );

      /**
       * Order number generation happens before the main checkout
       * transaction so the counter row is not locked throughout
       * the entire transaction.
       */
      expect(OrderNumberGenerator.generateNextOrderNumber).toHaveBeenCalledTimes(1);

      expect(OrderNumberGenerator.generateNextOrderNumber).toHaveBeenCalledWith();

      /**
       * The order creation now also creates the budget-approval
       * notification job as nested data.
       */
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderNumber: mockOrderNumber,
            requesterId: validUserId,
            unit: validInput.unit,
            status: OrderStatus.PENDING_BUDGET,
            budgetOfficerName: validInput.budgetOfficerName,
            budgetOfficerEmail: validInput.budgetOfficerEmail,

            itemEntries: expect.objectContaining({
              create: expect.any(Array),
            }),

            notificationJobs: {
              create: {
                type: NotificationJobType.BUDGET_APPROVAL,
                payload: {},
              },
            },
          }),
        })
      );

      /**
       * Verify that the nested order item was built from the cart
       * item using the authoritative server-side price.
       */
      const orderCreateCall = (prisma.order.create as jest.Mock).mock.calls[0][0];

      expect(orderCreateCall.data.itemEntries.create).toHaveLength(1);

      expect(orderCreateCall.data.itemEntries.create[0]).toEqual(
        expect.objectContaining({
          product: {
            connect: {
              id: 'prod-1',
            },
          },
          uploadedFilePath: '/uploads/doc.pdf',
          quantity: 10,
        })
      );

      /**
       * Selected attributes should be converted into nested
       * OrderItemAttributeValue records.
       */
      expect(orderCreateCall.data.itemEntries.create[0].itemAttributeEntries).toEqual({
        create: [
          expect.objectContaining({
            attributeDefinition: {
              connect: {
                id: 'attr-1',
              },
            },
            selectedOption: {
              connect: {
                id: 'opt-1',
              },
            },
            valueText: 'A4',
          }),
        ],
      });

      /**
       * Initial status history remains the responsibility of
       * AuditLogService. Because AuditLogService uses the supplied
       * transaction client, this ultimately calls the mocked
       * orderStatusHistory.create().
       */
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: mockCreatedOrder.id,
          toStatus: OrderStatus.PENDING_BUDGET,
          changedByUserId: validUserId,
          changedBySource: ChangeSource.SYSTEM,
          note: validInput.notes,
        }),
      });

      /**
       * Successful checkout converts the active cart.
       */
      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: mockCart.id,
          },
          data: expect.objectContaining({
            status: Status.CONVERTED,
            updatedAt: expect.any(Date),
          }),
        })
      );

      expect(result).toEqual(mockCreatedOrder);
    });

    it('should throw error if userId is missing', async () => {
      await expect(OrderService.createOrderFromCart('', validInput)).rejects.toThrow(
        'מזהה משתמש חסר'
      );

      expect(OrderNumberGenerator.generateNextOrderNumber).not.toHaveBeenCalled();

      expect(prisma.cart.findFirst).not.toHaveBeenCalled();

      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should throw error if budgetOfficerName is missing', async () => {
      await expect(
        OrderService.createOrderFromCart(validUserId, {
          ...validInput,
          budgetOfficerName: '',
        })
      ).rejects.toThrow('שם קצין תקציב הוא שדה חובה');

      expect(OrderNumberGenerator.generateNextOrderNumber).not.toHaveBeenCalled();
    });

    it('should throw error if budgetOfficerEmail is missing', async () => {
      await expect(
        OrderService.createOrderFromCart(validUserId, {
          ...validInput,
          budgetOfficerEmail: '',
        })
      ).rejects.toThrow('כתובת מייל קצין תקציב היא שדה חובה');

      expect(OrderNumberGenerator.generateNextOrderNumber).not.toHaveBeenCalled();
    });

    it('should throw error if budgetOfficerEmail is invalid', async () => {
      await expect(
        OrderService.createOrderFromCart(validUserId, {
          ...validInput,
          budgetOfficerEmail: 'not-an-email',
        })
      ).rejects.toThrow('כתובת מייל קצין תקציב אינה תקינה');

      expect(OrderNumberGenerator.generateNextOrderNumber).not.toHaveBeenCalled();
    });

    it('should throw error if active cart is not found', async () => {
      (OrderNumberGenerator.generateNextOrderNumber as jest.Mock).mockResolvedValue('2026-0001');

      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(OrderService.createOrderFromCart(validUserId, validInput)).rejects.toThrow(
        'לא נמצאה עגלת קניות פעילה עם פריטים'
      );

      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should throw error if active cart is empty', async () => {
      (OrderNumberGenerator.generateNextOrderNumber as jest.Mock).mockResolvedValue('2026-0001');

      (prisma.cart.findFirst as jest.Mock).mockResolvedValue({
        id: 'cart-1',
        userId: validUserId,
        status: Status.ACTIVE,
        cartItemEntries: [],
      });

      await expect(OrderService.createOrderFromCart(validUserId, validInput)).rejects.toThrow(
        'לא נמצאה עגלת קניות פעילה עם פריטים'
      );

      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should throw error if cart item quantity is invalid', async () => {
      (OrderNumberGenerator.generateNextOrderNumber as jest.Mock).mockResolvedValue('2026-0001');

      (prisma.cart.findFirst as jest.Mock).mockResolvedValue({
        id: 'cart-1',
        userId: validUserId,
        status: Status.ACTIVE,
        cartItemEntries: [
          {
            id: 'cart-item-1',
            productId: 'prod-1',
            quantity: 0,
            uploadedFilePath: '/uploads/doc.pdf',
            selectedAttributes: [],
            isDeleted: false,
          },
        ],
      });

      await expect(OrderService.createOrderFromCart(validUserId, validInput)).rejects.toThrow(
        'כמות פריט בעגלה אינה תקינה'
      );

      expect(PricingEngineService.calculatePrice).not.toHaveBeenCalled();

      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should not create the order if pricing fails', async () => {
      (OrderNumberGenerator.generateNextOrderNumber as jest.Mock).mockResolvedValue('2026-0001');

      (prisma.cart.findFirst as jest.Mock).mockResolvedValue({
        id: 'cart-1',
        userId: validUserId,
        status: Status.ACTIVE,
        cartItemEntries: [
          {
            id: 'cart-item-1',
            productId: 'prod-1',
            quantity: 10,
            uploadedFilePath: '/uploads/doc.pdf',
            selectedAttributes: [],
            isDeleted: false,
          },
        ],
      });

      (PricingEngineService.calculatePrice as jest.Mock).mockRejectedValue(
        new Error('Pricing failed')
      );

      await expect(OrderService.createOrderFromCart(validUserId, validInput)).rejects.toThrow(
        'Pricing failed'
      );

      expect(prisma.order.create).not.toHaveBeenCalled();

      expect(prisma.cart.update).not.toHaveBeenCalled();
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

      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'order-1',
            isDeleted: false,
          },
        })
      );
    });

    it('should forbid requester from viewing another user order', async () => {
      const mockOrder = {
        id: 'order-1',
        requesterId: 'user-2',
        orderNumber: '2026-0001',
      };

      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);

      await expect(
        OrderService.getOrderById('order-1', {
          id: 'user-1',
          role: Role.REQUESTER,
        })
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

    it('should allow worker to view an order', async () => {
      const mockOrder = {
        id: 'order-1',
        requesterId: 'user-2',
        orderNumber: '2026-0001',
      };

      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);

      const result = await OrderService.getOrderById('order-1', {
        id: 'worker-1',
        role: Role.WORKER,
      });

      expect(result).toEqual(mockOrder);
    });

    it('should throw error if order is not found', async () => {
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        OrderService.getOrderById('order-999', {
          id: 'user-1',
          role: Role.REQUESTER,
        })
      ).rejects.toThrow('ההזמנה לא נמצאה');
    });

    it('should throw error if orderId is missing', async () => {
      await expect(
        OrderService.getOrderById('', {
          id: 'user-1',
          role: Role.REQUESTER,
        })
      ).rejects.toThrow('מזהה הזמנה חסר');

      expect(prisma.order.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('getOrders', () => {
    it('should filter by requesterId for REQUESTER role', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: '2026-0001',
        },
      ];

      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

      (prisma.order.count as jest.Mock).mockResolvedValue(1);

      const result = await OrderService.getOrders(
        {
          id: 'user-1',
          role: Role.REQUESTER,
        },
        {
          page: 1,
          limit: 10,
        }
      );

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requesterId: 'user-1',
            isDeleted: false,
          }),
        })
      );

      expect(prisma.order.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          requesterId: 'user-1',
          isDeleted: false,
        }),
      });

      expect(result.orders).toEqual(mockOrders);

      expect(result.total).toBe(1);
    });

    it('should allow manager to query all orders with search', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: '2026-0001',
        },
      ];

      (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);

      (prisma.order.count as jest.Mock).mockResolvedValue(1);

      const result = await OrderService.getOrders(
        {
          id: 'manager-1',
          role: Role.MANAGER,
        },
        {
          search: '2026',
          status: OrderStatus.PENDING_BUDGET,
        }
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

      expect(prisma.order.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: OrderStatus.PENDING_BUDGET,
          OR: expect.any(Array),
          isDeleted: false,
        }),
      });

      expect(result.orders).toEqual(mockOrders);

      expect(result.total).toBe(1);
    });

    it('should not restrict manager orders by requesterId', async () => {
      (prisma.order.findMany as jest.Mock).mockResolvedValue([]);

      (prisma.order.count as jest.Mock).mockResolvedValue(0);

      await OrderService.getOrders({
        id: 'manager-1',
        role: Role.MANAGER,
      });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            requesterId: expect.anything(),
          }),
        })
      );
    });

    it('should apply pagination values', async () => {
      (prisma.order.findMany as jest.Mock).mockResolvedValue([]);

      (prisma.order.count as jest.Mock).mockResolvedValue(25);

      const result = await OrderService.getOrders(
        {
          id: 'manager-1',
          role: Role.MANAGER,
        },
        {
          page: 2,
          limit: 10,
        }
      );

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );

      expect(result.total).toBe(25);
    });
  });
});
