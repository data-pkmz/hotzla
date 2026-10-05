import { ChangeSource, OrderStatus as PrismaOrderStatus } from '@prisma/client';

import { prisma } from '../config/db';
import { AuditLogService } from './audit-log.service';
import { NotificationService } from './notification.service';

import { isOrderStatusTransitionAllowed, type OrderStatus } from 'shared-types';

/**
 * Input required to perform an order status transition.
 */
interface TransitionOrderStatusInput {
  /** UUID of the order whose status should be changed. */
  orderId: string;

  /** New status that should be applied to the order. */
  toStatus: OrderStatus;

  /** Database ID of the user responsible for the change, when applicable. */
  changedByUserId?: string | null;

  /** Source from which the status change originated. */
  changedBySource: ChangeSource;

  /** Optional explanation or additional information about the transition. */
  note?: string | null;
}

/**
 * Minimal shape returned by the raw SELECT ... FOR UPDATE query.
 */
interface LockedOrderRow {
  id: string;
}

export class ApprovalService {
  /**
   * Changes an order's status while enforcing the application's allowed
   * status-transition rules and protecting against concurrent updates.
   *
   * Expects:
   * - orderId: UUID of the order whose status should change.
   * - toStatus: New status requested for the order.
   * - changedByUserId: Optional database ID of the user responsible for
   *   the transition. Defaults to null for non-user sources.
   * - changedBySource: Source of the transition, such as MANAGER_UI,
   *   WORKER_UI, SYSTEM, or EMAIL_BUDGET_OFFICER.
   * - note: Optional description or reason for the transition.
   *
   * Does:
   * - Verifies that an order ID was provided.
   * - Starts a Prisma database transaction.
   * - Acquires a PostgreSQL row lock on the order using SELECT ... FOR UPDATE.
   *   This prevents two concurrent requests from validating and updating the
   *   same order using an outdated status.
   * - Retrieves the current order after acquiring the lock.
   * - Validates the requested transition using
   *   isOrderStatusTransitionAllowed.
   * - Stores additional approval metadata when applicable:
   *   - Budget approval records approvedByBudgetAt.
   *   - Manager approval records approvedByManagerId and approvedByManagerAt.
   * - Updates the order's current status.
   * - Creates the matching OrderStatusHistory record through AuditLogService
   *   using the same transaction.
   * - Sends requester notifications after the transaction commits when
   *   required by the resulting status.
   *
   * Returns:
   * - The updated order after the transaction successfully commits.
   *
   * Throws:
   * - "Order ID is required" if no order ID was supplied.
   * - "Order not found" if the order does not exist or has been soft-deleted.
   * - An error when the requested status transition is not allowed.
   * - Any database error produced while locking, updating, or recording
   *   the status history.
   *
   * Transaction behavior:
   * - The order update and its OrderStatusHistory record are written in the
   *   same transaction, so they either both succeed or both roll back.
   * - External notification work is performed only after the transaction
   *   commits so SMTP work never holds the order row lock.
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
       * Prisma does not expose SELECT ... FOR UPDATE through its normal
       * findUnique/findFirst API, so a parameterized PostgreSQL query is used
       * to acquire an exclusive lock on this order row for the duration of
       * the transaction.
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
       * A successful budget approval transitions:
       *
       * PENDING_BUDGET -> PENDING_MANAGER_APPROVAL
       *
       * The approval timestamp is stored directly on the order.
       */
      const isBudgetApproval =
        currentStatus === PrismaOrderStatus.PENDING_BUDGET &&
        toStatus === PrismaOrderStatus.PENDING_MANAGER_APPROVAL;

      /**
       * A successful manager approval transitions:
       *
       * PENDING_MANAGER_APPROVAL -> APPROVED_FOR_PRODUCTION
       *
       * The approving manager and approval timestamp are stored directly
       * on the order when the transition originates from the manager UI.
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

      /**
       * Record the status transition using the same Prisma transaction so the
       * order update and its history entry cannot become inconsistent.
       */
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
     * commits so external SMTP work never holds the order row lock and no
     * notification is sent for a rolled-back status transition.
     */
    if (result.toStatus === 'READY_FOR_PICKUP') {
      const order = await prisma.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          requester: {
            select: {
              militaryEmail: true,
            },
          },
        },
      });

      /**
       * A missing requester email is not considered a delivery attempt.
       * The status transition remains successful and no invalid email is sent.
       */
      if (order?.requester.militaryEmail) {
        await NotificationService.notifyRequesterStatusChange({
          status: result.toStatus,
          orderId: order.id,
          orderNumber: order.orderNumber,
          requesterEmail: order.requester.militaryEmail,
          trackingUrl: `${process.env.APP_BASE_URL}/my-orders`,
        });
      }
    }

    return result.order;
  }
}
