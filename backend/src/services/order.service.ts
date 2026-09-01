import { ChangeSource, OrderStatus, Prisma, Role, Status } from '@prisma/client';
import { prisma } from '../config/db';
import { OrderNumberGenerator } from '../utils/order-number-generator';
import { PricingEngineService } from './pricing-engine.service';
import { AuditLogService } from './audit-log.service';
import { EmailService } from './email.service';
import logger from '../utils/logger';
import type {
  CreateOrderInput,
  Order,
  OrderListResponse,
  OrderQueryParams,
  SelectedAttributeInput,
} from 'shared-types';

export class OrderService {
  /**
   * Converts an active cart into a new order.
   *
   * 1. Validates user and active cart with items.
   * 2. Recalculates authoritative prices on the server via PricingEngineService.
   * 3. Generates a unique sequential order number in format YYYY-NNNN.
   * 4. Creates the Order with initial status PENDING_BUDGET.
   * 5. Creates OrderItem and OrderItemAttributeValue records.
   * 6. Creates initial OrderStatusHistory entry.
   * 7. Sets the active Cart status to CONVERTED.
   *
   * All DB operations run inside a single transaction.
   */
  public static async createOrderFromCart(userId: string, input: CreateOrderInput) {
    if (!userId) {
      throw new Error('מזהה משתמש חסר');
    }

    if (!input.budgetOfficerName || !input.budgetOfficerName.trim()) {
      throw new Error('שם קצין תקציב הוא שדה חובה');
    }

    if (!input.budgetOfficerEmail || !input.budgetOfficerEmail.trim()) {
      throw new Error('כתובת מייל קצין תקציב היא שדה חובה');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.budgetOfficerEmail.trim())) {
      throw new Error('כתובת מייל קצין תקציב אינה תקינה');
    }

    const newOrder = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          id: userId,
          isDeleted: false,
        },
      });

      if (!user) {
        throw new Error('המשתמש לא נמצא');
      }

      const activeCart = await tx.cart.findFirst({
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
          },
        },
      });

      if (!activeCart || !activeCart.cartItemEntries || activeCart.cartItemEntries.length === 0) {
        throw new Error('לא נמצאה עגלת קניות פעילה עם פריטים');
      }

      let totalOrderPrice = new Prisma.Decimal(0);
      const orderItemsCreateData: Prisma.OrderItemCreateWithoutOrderInput[] = [];

      for (const item of activeCart.cartItemEntries) {
        const quantityNum = Number(item.quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
          throw new Error('כמות פריט בעגלה אינה תקינה');
        }

        const selectedAttributesArray = Array.isArray(item.selectedAttributes)
          ? (item.selectedAttributes as unknown as SelectedAttributeInput[])
          : [];

        // Authoritative server-side price calculation
        const priceResult = await PricingEngineService.calculatePrice({
          productId: item.productId,
          quantity: quantityNum,
          selectedAttributes: selectedAttributesArray,
        });

        const computedTotalPrice = new Prisma.Decimal(priceResult.totalPrice);
        const computedUnitPrice = computedTotalPrice.div(new Prisma.Decimal(quantityNum));

        totalOrderPrice = totalOrderPrice.add(computedTotalPrice);

        const attributeValuesCreate: Prisma.OrderItemAttributeValueCreateWithoutOrderItemInput[] =
          [];

        for (const attr of selectedAttributesArray) {
          if (attr.selectedOptionIds && attr.selectedOptionIds.length > 0) {
            for (const optId of attr.selectedOptionIds) {
              attributeValuesCreate.push({
                attributeDefinition: { connect: { id: attr.attributeDefinitionId } },
                selectedOption: { connect: { id: optId } },
                valueText: String(attr.value ?? optId),
              });
            }
          } else if (attr.selectedOptionId) {
            attributeValuesCreate.push({
              attributeDefinition: { connect: { id: attr.attributeDefinitionId } },
              selectedOption: { connect: { id: attr.selectedOptionId } },
              valueText: String(attr.value ?? ''),
            });
          }
        }

        orderItemsCreateData.push({
          product: { connect: { id: item.productId } },
          uploadedFilePath: item.uploadedFilePath || '',
          quantity: item.quantity,
          computedUnitPrice,
          computedTotalPrice,
          itemAttributeEntries:
            attributeValuesCreate.length > 0
              ? {
                  create: attributeValuesCreate,
                }
              : undefined,
        });
      }

      const orderNumber = await OrderNumberGenerator.generateNextOrderNumber(tx);

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          requesterId: userId,
          unit: input.unit?.trim() || user.unit || '',
          status: OrderStatus.PENDING_BUDGET,
          budgetOfficerName: input.budgetOfficerName.trim(),
          budgetOfficerEmail: input.budgetOfficerEmail.trim(),
          totalPrice: totalOrderPrice,
          itemEntries: {
            create: orderItemsCreateData,
          },
        },
        include: {
          requester: {
            select: {
              id: true,
              fullName: true,
              militaryEmail: true,
              unit: true,
              phone: true,
            },
          },
          itemEntries: {
            include: {
              product: true,
              itemAttributeEntries: {
                include: {
                  attributeDefinition: true,
                  selectedOption: true,
                },
              },
            },
          },
        },
      });

      await AuditLogService.logStatusChange(
        {
          orderId: newOrder.id,
          toStatus: OrderStatus.PENDING_BUDGET,
          changedByUserId: userId,
          changedBySource: ChangeSource.SYSTEM,
          note: input.notes?.trim() || 'הזמנה נוצרה ממערכת ההזמנות',
        },
        tx
      );

      await tx.cart.update({
        where: {
          id: activeCart.id,
        },
        data: {
          status: Status.CONVERTED,
          updatedAt: new Date(),
        },
      });

      AuditLogService.logSystemEvent('OrderCreated', {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        userId,
      });

      return newOrder;
    });

    if (!newOrder.requester.militaryEmail) {
      logger.error('Requester email is missing', {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        requesterId: newOrder.requester.id,
      });
    } else {
      try {
        await EmailService.sendOrderConfirmation({
          orderId: newOrder.id,
          orderNumber: newOrder.orderNumber,
          requesterEmail: newOrder.requester.militaryEmail,
          trackingUrl: `${process.env.APP_BASE_URL}/my-orders`,
        });
      } catch (error) {
        logger.error('Failed to send order confirmation email', {
          orderId: newOrder.id,
          orderNumber: newOrder.orderNumber,
          requesterEmail: newOrder.requester.militaryEmail,
          error,
        });
      }
    }

    return newOrder;
  }

  /**
   * Fetches an order by its ID with role-based access validation.
   * Requesters can only view their own orders. Managers and workers can view any order.
   */
  public static async getOrderById(orderId: string, currentUser: { id: string; role: Role }) {
    if (!orderId) {
      throw new Error('מזהה הזמנה חסר');
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        isDeleted: false,
      },
      include: {
        requester: {
          select: {
            id: true,
            fullName: true,
            militaryEmail: true,
            unit: true,
            phone: true,
          },
        },
        approvedByManager: {
          select: {
            id: true,
            fullName: true,
            militaryEmail: true,
          },
        },
        worker: {
          select: {
            id: true,
            fullName: true,
            militaryEmail: true,
          },
        },
        itemEntries: {
          where: {
            isDeleted: false,
          },
          include: {
            product: true,
            itemAttributeEntries: {
              where: {
                isDeleted: false,
              },
              include: {
                attributeDefinition: true,
                selectedOption: true,
              },
            },
          },
        },
        orderStatus: {
          where: {
            isDeleted: false,
          },
          orderBy: {
            changedAt: 'asc',
          },
          include: {
            changedByUser: {
              select: {
                id: true,
                fullName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error('ההזמנה לא נמצאה');
    }

    if (currentUser.role === Role.REQUESTER && order.requesterId !== currentUser.id) {
      throw new Error('אין לך הרשאה לצפות בהזמנה זו');
    }

    return order;
  }

  /**
   * Fetches orders list with role-based filtering, search, pagination, and sorting.
   */
  public static async getOrders(
    currentUser: { id: string; role: Role },
    params?: OrderQueryParams
  ): Promise<OrderListResponse> {
    const where: Prisma.OrderWhereInput = {
      isDeleted: false,
    };

    if (currentUser.role === Role.REQUESTER) {
      where.requesterId = currentUser.id;
    }

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.search && params.search.trim()) {
      const search = params.search.trim();
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { unit: { contains: search, mode: 'insensitive' } },
        { budgetOfficerName: { contains: search, mode: 'insensitive' } },
        { budgetOfficerEmail: { contains: search, mode: 'insensitive' } },
        { requester: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.max(1, Math.min(100, params?.limit ?? 10));
    const skip = (page - 1) * limit;

    const allowedSortFields = ['createdAt', 'orderNumber', 'totalPrice', 'status'];
    const sortBy =
      params?.sortBy && allowedSortFields.includes(params.sortBy) ? params.sortBy : 'createdAt';
    const sortOrder = params?.sortOrder === 'asc' ? 'asc' : 'desc';

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          requester: {
            select: {
              id: true,
              fullName: true,
              militaryEmail: true,
              unit: true,
              phone: true,
            },
          },
          itemEntries: {
            where: { isDeleted: false },
            include: {
              product: true,
            },
          },
          orderStatus: {
            where: { isDeleted: false },
            orderBy: { changedAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders: orders as unknown as Order[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
