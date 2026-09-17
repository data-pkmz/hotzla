import { ChangeSource, OrderStatus, Prisma, Role, Status } from '@prisma/client';
import { prisma } from '../config/db';
import { OrderNumberGenerator } from '../utils/order-number-generator';
import { PricingEngineService } from './pricing-engine.service';
import { AuditLogService } from './audit-log.service';
import { EmailService } from './email.service';
import { TokenService } from './token.service';
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
   * Converts the authenticated user's active cart into a new order.
   *
   * Expects:
   * - userId: Database ID of the requester creating the order.
   * - input.budgetOfficerName: Name of the budget officer responsible for approval.
   * - input.budgetOfficerEmail: Valid email address of the budget officer.
   * - input.unit: Optional requesting unit. Falls back to the user's stored unit.
   * - input.notes: Optional note recorded with the initial order status history entry.
   *
   * Does:
   * - Validates the requester ID and required budget officer information.
   * - Verifies that the requester exists and is not deleted.
   * - Retrieves the requester's active cart and verifies that it contains items.
   * - Recalculates every cart item's authoritative price using PricingEngineService
   *   instead of trusting the price previously stored in the cart.
   * - Converts selected product attributes into OrderItemAttributeValue records.
   * - Calculates the total order price.
   * - Generates the next sequential order number.
   * - Creates the Order with initial status PENDING_BUDGET.
   * - Creates the corresponding OrderItem and attribute-value records.
   * - Records the initial status change through AuditLogService.
   * - Marks the active cart as CONVERTED.
   * - Performs the database changes inside a single Prisma transaction.
   * - After the transaction succeeds, attempts to send:
   *   - an order confirmation email to the requester.
   *   - a budget approval email to the budget officer.
   * - Email failures are logged but do not roll back the successfully created order.
   *
   * Returns:
   * - The newly created order including requester information, order items,
   *   products, and selected item attributes.
   *
   * Throws:
   * - If required requester or budget officer information is missing or invalid.
   * - If the requester does not exist.
   * - If no active cart with items exists.
   * - If a cart item's quantity or pricing data is invalid.
   * - Any error produced while creating the order or related database records.
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

    /**
     * Sends the budget approval request after the order transaction commits.
     *
     * The approval email contains a public, token-based link so the budget
     * officer can review and approve or reject the order without having an
     * authenticated application user.
     *
     * The approval token is valid for seven days and may only be used once.
     *
     * Email or token-generation failures are logged but do not roll back the
     * already-created order.
     */
    try {
      const approvalToken = await TokenService.generateApprovalToken(newOrder.id);

      const approvalUrl = `${process.env.APP_BASE_URL}/public/approval/${approvalToken}`;

      await EmailService.sendBudgetApproval({
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        requesterName: newOrder.requester.fullName ?? 'לא צוין שם מזמין',
        budgetOfficerEmail: newOrder.budgetOfficerEmail,
        totalPrice: Number(newOrder.totalPrice),
        approvalUrl,
        items: newOrder.itemEntries.map((item) => ({
          productName: item.product.name,
          quantity: Number(item.quantity),
          price: Number(item.computedTotalPrice),
          specifications: item.itemAttributeEntries.map((attribute) => ({
            name: attribute.attributeDefinition.attributeName,
            value: attribute.selectedOption?.optionLabel ?? attribute.valueText ?? '',
          })),
        })),
      });
    } catch (error) {
      logger.error('Failed to send budget approval email', {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        budgetOfficerEmail: newOrder.budgetOfficerEmail,
        error,
      });
    }

    return newOrder;
  }

  /**
   * Retrieves a single order and enforces role-based access to it.
   *
   * Expects:
   * - orderId: UUID of the order to retrieve.
   * - currentUser.id: Database ID of the authenticated user.
   * - currentUser.role: Application role of the authenticated user.
   *
   * Does:
   * - Retrieves the non-deleted order and its related requester information.
   * - Loads assigned manager and worker information when available.
   * - Loads non-deleted order items, their products, and configured attributes.
   * - Loads the complete non-deleted status history in chronological order.
   * - For REQUESTER users, verifies that the requested order belongs to them.
   * - MANAGER and WORKER users are allowed to retrieve any matching order.
   *
   * Returns:
   * - The complete order with its related user, item, attribute, and status data.
   *
   * Throws:
   * - If the order ID is missing.
   * - If the order does not exist or has been deleted.
   * - If a REQUESTER attempts to access another requester's order.
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
   * Retrieves a paginated, searchable, and sortable list of orders while
   * applying visibility rules based on the authenticated user's role.
   *
   * Expects:
   * - currentUser.id: Database ID of the authenticated user.
   * - currentUser.role: Application role used to determine order visibility.
   * - params.page: Optional page number.
   * - params.limit: Optional number of orders per page.
   * - params.status: Optional order-status filter.
   * - params.search: Optional search term for order number or requester name.
   * - params.sortBy: Optional supported field used to sort the results.
   * - params.sortOrder: Optional "asc" or "desc" sorting direction.
   *
   * Does:
   * - Excludes soft-deleted orders.
   * - Restricts REQUESTER users to orders that they created.
   * - Restricts WORKER users to production-related order statuses.
   * - Allows status filtering when permitted by the user's role.
   * - Applies a case-insensitive search against order number and requester name.
   * - Ensures page is at least 1.
   * - Restricts page size to between 1 and 100.
   * - Allows sorting only by supported fields and defaults to createdAt.
   * - Retrieves the requested page and total matching order count in parallel.
   *
   * Returns:
   * - An OrderListResponse containing:
   *   - orders: The orders visible on the requested page.
   *   - total: Total number of matching orders.
   *   - page: Current page number.
   *   - limit: Number of orders per page.
   *   - totalPages: Total number of available pages.
   *
   * Throws:
   * - Any database error encountered while retrieving or counting orders.
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
        where.status = { in: allowedWorkerStatuses };
      }
    } else {
      if (params?.status) {
        where.status = params.status;
      }
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
