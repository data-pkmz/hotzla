import { ChangeSource, OrderStatus as PrismaOrderStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { AuditLogService } from './audit-log.service';
import { isOrderStatusTransitionAllowed, type OrderStatus } from 'shared-types';

interface TransitionOrderStatusInput {
  orderId: string;
  toStatus: OrderStatus;
  changedByUserId?: string | null;
  changedBySource: ChangeSource;
  note?: string | null;
}

interface LockedOrderRow {
  id: string;
}

export class ApprovalService {
  /**
   * Changes an order's status while enforcing the allowed status-transition matrix.
   *
   * The order row is locked for the duration of the transaction so that two
   * concurrent requests cannot validate and update the same order using a
   * stale status.
   *
   * The status update and OrderStatusHistory entry are written in the same
   * transaction so they either both succeed or both fail.
   */
  public static async transitionOrderStatus({
    orderId,
    toStatus,
    changedByUserId = null,
    changedBySource,
    note = null,
  }: TransitionOrderStatusInput) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    const result = await prisma.$transaction(async (tx) => {
      /**
       * Prisma does not currently expose SELECT ... FOR UPDATE through the
       * normal findUnique/findFirst API, so we acquire the PostgreSQL row lock
       * using a parameterized raw query.
       *
       * This prevents race conditions between simultaneous status updates.
       */
      const lockedRows = await tx.$queryRaw<LockedOrderRow[]>`
        SELECT id
        FROM orders
        WHERE id = ${orderId}::uuid
          AND is_deleted = false
        FOR UPDATE
      `;

      if (lockedRows.length === 0) {
        throw new Error('Order not found');
      }

      const order = await tx.order.findUnique({
        where: {
          id: orderId,
        },
      });

      if (!order || order.isDeleted) {
        throw new Error('Order not found');
      }

      const currentStatus = order.status as OrderStatus;

      if (!isOrderStatusTransitionAllowed(currentStatus, toStatus)) {
        throw new Error(`Invalid order status transition: ${currentStatus} -> ${toStatus}`);
      }

      /**
       * Budget approval:
       *
       * PENDING_BUDGET -> PENDING_MANAGER_APPROVAL
       *
       * Store the approval time directly on the order.
       */
      const isBudgetApproval =
        currentStatus === PrismaOrderStatus.PENDING_BUDGET &&
        toStatus === PrismaOrderStatus.PENDING_MANAGER_APPROVAL;

      /**
       * Manager approval:
       *
       * PENDING_MANAGER_APPROVAL -> APPROVED_FOR_PRODUCTION
       *
       * Store both the approving manager and approval time.
       */
      const isManagerApproval =
        currentStatus === PrismaOrderStatus.PENDING_MANAGER_APPROVAL &&
        toStatus === PrismaOrderStatus.APPROVED_FOR_PRODUCTION &&
        changedBySource === ChangeSource.MANAGER_UI &&
        changedByUserId !== null;

      const updatedOrder = await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: toStatus,

          ...(isBudgetApproval
            ? {
                approvedByBudgetAt: new Date(),
              }
            : {}),

          ...(isManagerApproval
            ? {
                approvedByManagerId: changedByUserId,
                approvedByManagerAt: new Date(),
              }
            : {}),
        },
      });

      await AuditLogService.logStatusChange(
        {
          orderId,
          fromStatus: currentStatus,
          toStatus,
          changedByUserId,
          changedBySource,
          note,
        },
        tx
      );

      return {
        order: updatedOrder,
        fromStatus: currentStatus,
        toStatus,
      };
    });

    /**
     * Transition-related notifications are triggered after the transaction
     * so the order row is not kept locked while waiting on external services.
     */
    return result.order;
  }
}
