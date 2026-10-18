import type {
  CreateOrderInput,
  Order,
  OrderListResponse,
  OrderQueryParams,
  SelectedAttributeInput,
} from 'shared-types';
import {
  ChangeSource,
  NotificationJobType,
  OrderStatus,
  Prisma,
  Role,
  Status,
} from '@prisma/client';
import { prisma } from '../config/db';
import { OrderNumberGenerator } from '../utils/order-number-generator';
import { AuditLogService } from './audit-log.service';
import { PricingEngineService } from './pricing-engine.service';
export class OrderService {
  /**
   * Converts an active cart into a new order.
   *
   * 1. Validates the requester and checkout information.
   * 2. Generates a unique sequential order number outside the main
   *    checkout transaction.
   * 3. Retrieves the active cart and validates its items.
   * 4. Recalculates authoritative prices on the server.
   * 5. Creates the Order, OrderItems, and attribute-value records.
   * 6. Creates the initial order-status history entry.
   * 7. Marks the active Cart as CONVERTED.
   * 8. Queues the budget-approval notification job as part of order creation.
   *
   * The order number is intentionally allocated before the main transaction
   * so the yearly order-number counter does not become a lock held for the
   * entire checkout transaction.
   */
  public static async createOrderFromCart(userId: string, input: CreateOrderInput) {
    if (!userId) {
      throw new Error('מזהה משתמש חסר');
    }
    const budgetOfficerName =
      input.budgetOfficerName?.trim() || input.budgetOfficer?.fullName?.trim() || '';
    const budgetOfficerEmail =
      input.budgetOfficerEmail?.trim() || input.budgetOfficer?.militaryEmail?.trim() || '';
    if (!budgetOfficerName) {
      throw new Error('שם קצין תקציב הוא שדה חובה');
    }
    if (!budgetOfficerEmail) {
      throw new Error('כתובת מייל קצין תקציב היא שדה חובה');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(budgetOfficerEmail)) {
      throw new Error('כתובת מייל קצין תקציב אינה תקינה');
    }
    /**
     * Generate the order number before the main checkout transaction.
     */
    const orderNumber = await OrderNumberGenerator.generateNextOrderNumber();
    /**
     * Main checkout transaction.
     */
    const newOrder = await prisma.$transaction(async (tx) => {
      /**
       * Load active cart and its items.
       */
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
      /**
       * Reprice cart items and build the nested create input.
       */
      for (const item of activeCart.cartItemEntries) {
        const quantityNum = Number(item.quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
          throw new Error('כמות פריט בעגלה אינה תקינה');
        }
        const selectedAttributesArray = Array.isArray(item.selectedAttributes)
          ? (item.selectedAttributes as unknown as SelectedAttributeInput[])
          : [];
        // Normalize legacy singular SELECT IDs before both pricing and persistence.
        const normalizedSelectedAttributes = selectedAttributesArray.map((attr) => ({
          ...attr,
          selectedOptionIds:
            attr.selectedOptionIds && attr.selectedOptionIds.length > 0
              ? [...new Set(attr.selectedOptionIds)]
              : attr.selectedOptionId
                ? [attr.selectedOptionId]
                : [],
        }));
        const priceResult = await PricingEngineService.calculatePrice(
          {
            productId: item.productId,
            quantity: quantityNum,
            selectedAttributes: normalizedSelectedAttributes,
          },
          tx
        );
        const computedTotalPrice = new Prisma.Decimal(priceResult.totalPrice);
        const computedUnitPrice = computedTotalPrice.div(new Prisma.Decimal(quantityNum));
        totalOrderPrice = totalOrderPrice.add(computedTotalPrice);
        const attributeValuesCreate: Prisma.OrderItemAttributeValueCreateWithoutOrderItemInput[] =
          [];
        for (const attr of normalizedSelectedAttributes) {
          if (attr.selectedOptionIds.length > 0) {
            // SELECT: retain the chosen option IDs (duplicates were removed above).
            for (const optionId of attr.selectedOptionIds) {
              attributeValuesCreate.push({
                attributeDefinition: {
                  connect: { id: attr.attributeDefinitionId },
                },
                selectedOption: {
                  connect: { id: optionId },
                },
                valueText: String(attr.value ?? optionId),
              });
            }
          } else if (attr.value !== undefined && attr.value !== null) {
            // NUMBER, BOOLEAN, TEXT and string-based values.
            // Preserve 0, false and empty strings.
            attributeValuesCreate.push({
              attributeDefinition: {
                connect: { id: attr.attributeDefinitionId },
              },
              valueText: String(attr.value),
            });
          }
        }
        orderItemsCreateData.push({
          product: {
            connect: {
              id: item.productId,
            },
          },
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
      /**
       * Create the order and all nested order-item records.
       */
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          requesterId: userId,
          unit: input.unit?.trim() || '',
          status: OrderStatus.PENDING_BUDGET,
          budgetOfficerName,
          budgetOfficerEmail,
          totalPrice: totalOrderPrice,
          itemEntries: {
            create: orderItemsCreateData,
          },
          notificationJobs: {
            create: {
              type: NotificationJobType.BUDGET_APPROVAL,
              payload: {} as Prisma.InputJsonValue,
            },
          },
        },
      });
      /**
       * Initial status/audit records.
       */
      await AuditLogService.logStatusChange(
        {
          orderId: createdOrder.id,
          toStatus: OrderStatus.PENDING_BUDGET,
          changedByUserId: userId,
          changedBySource: ChangeSource.SYSTEM,
          note: input.notes?.trim() || 'הזמנה נוצרה ממערכת ההזמנות',
        },
        tx
      );
      /**
       * Convert the active cart.
       */
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
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        userId,
      });
      return createdOrder;
    });
    return newOrder;
  }
  /**
   * Fetches an order by its ID with role-based access validation.
   * Requesters can only view their own orders.
   * Managers and workers can view any order.
   */
  public static async getOrderById(
    orderId: string,
    currentUser: {
      id: string;
      role: Role;
    }
  ) {
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
   * Fetches orders list with role-based filtering, search,
   * pagination, and sorting.
   */
  public static async getOrders(
    currentUser: {
      id: string;
      role: Role;
    },
    params?: OrderQueryParams
  ): Promise<OrderListResponse> {
    const where: Prisma.OrderWhereInput = {
      isDeleted: false,
    };
    if (currentUser.role === Role.REQUESTER) {
      where.requesterId = currentUser.id;
    }
    if (currentUser.role === Role.WORKER) {
      const allowedWorkerStatuses: OrderStatus[] = [
        OrderStatus.APPROVED_FOR_PRODUCTION,
        OrderStatus.IN_PRODUCTION,
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.COMPLETED,
      ];
      if (params?.status && allowedWorkerStatuses.includes(params.status)) {
        where.status = params.status;
      } else {
        where.status = {
          in: allowedWorkerStatuses,
        };
      }
    } else if (params?.status) {
      where.status = params.status;
    }
    if (params?.search && params.search.trim()) {
      const search = params.search.trim();
      where.OR = [
        {
          orderNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          requester: {
            fullName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.max(1, Math.min(100, params?.limit ?? 10));
    const skip = (page - 1) * limit;
    const allowedSortFields = [
      'createdAt',
      'orderNumber',
      'totalPrice',
      'status',
      'requesterName',
      'unit',
    ];
    const sortBy =
      params?.sortBy && allowedSortFields.includes(params.sortBy) ? params.sortBy : 'createdAt';
    const sortOrder = params?.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: Prisma.OrderOrderByWithRelationInput =
      sortBy === 'requesterName'
        ? {
            requester: {
              fullName: sortOrder,
            },
          }
        : {
            [sortBy]: sortOrder,
          };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
            where: {
              isDeleted: false,
            },
            include: {
              product: true,
            },
          },
          orderStatus: {
            where: {
              isDeleted: false,
            },
            orderBy: {
              changedAt: 'desc',
            },
            take: 1,
          },
        },
      }),
      prisma.order.count({
        where,
      }),
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
