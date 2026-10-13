import type { Prisma } from '@prisma/client';
import type { LogStatusChangeParams, OrderStatusHistory } from 'shared-types';

import { prisma } from '../config/db';
import logger from '../utils/logger';

export type { LogStatusChangeParams };

/**
 * Allows logStatusChange to operate either with the normal Prisma client
 * or with an existing Prisma transaction.
 */
type PrismaClientOrTransaction = typeof prisma | Prisma.TransactionClient;

export class AuditLogService {
  /**
   * Records an order status transition in both the application logs
   * and the OrderStatusHistory database table.
   *
   * Expects:
   * - params.orderId: ID of the order whose status changed.
   * - params.fromStatus: Previous order status, if one exists.
   * - params.toStatus: New status assigned to the order.
   * - params.changedByUserId: Optional ID of the user responsible for the change.
   * - params.changedBySource: Source of the change, such as SYSTEM,
   *   MANAGER_UI, WORKER_UI, or an email-processing source.
   * - params.note: Optional description or reason for the status change.
   * - db: Optional Prisma client or transaction client. Defaults to the
   *   application's normal Prisma client.
   *
   * Does:
   * - Writes a structured audit entry to the application logger.
   * - Creates a corresponding OrderStatusHistory record in the database.
   * - Uses the provided Prisma transaction when one is supplied so the
   *   history record can participate in the caller's database transaction.
   *
   * Returns:
   * - The newly created OrderStatusHistory record.
   *
   * Throws:
   * - Any database error produced while creating the history record.
   */
  public static async logStatusChange(
    params: LogStatusChangeParams,
    db: PrismaClientOrTransaction = prisma
  ): Promise<OrderStatusHistory> {
    const { orderId, fromStatus, toStatus, changedByUserId, changedBySource, note } = params;

    logger.info(
      `AuditLog: Order ${orderId} status changed from ${fromStatus ?? 'NONE'} to ${toStatus}`,
      {
        audit: true,
        orderId,
        fromStatus,
        toStatus,
        changedByUserId,
        changedBySource,
        note,
      }
    );

    const history = await db.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus,
        toStatus,
        changedByUserId,
        changedBySource,
        note,
      },
    });

    return history;
  }

  /**
   * Retrieves the complete status-change timeline for an order.
   *
   * Expects:
   * - orderId: ID of the order whose status history should be retrieved.
   *
   * Does:
   * - Queries OrderStatusHistory records belonging to the specified order.
   * - Sorts the history chronologically from oldest to newest.
   * - Includes basic information about the user responsible for each
   *   status change when a user is associated with the event.
   *
   * Returns:
   * - An array of OrderStatusHistory records representing the order's
   *   status timeline.
   *
   * Throws:
   * - Any database error produced while retrieving the history.
   */
  public static async getStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    return prisma.orderStatusHistory.findMany({
      where: {
        orderId,
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
            militaryEmail: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Writes a general system-level audit event to the application logs.
   *
   * Expects:
   * - action: Name of the system event being recorded.
   * - details: Optional structured metadata related to the event.
   *
   * Does:
   * - Writes an informational log entry marked with audit=true.
   * - Adds the supplied action and optional details to the structured log data.
   * - Does not create a database OrderStatusHistory record because this method
   *   is intended for general system events rather than order status changes.
   *
   * Returns:
   * - Nothing. Logging is performed synchronously through the configured logger.
   */
  public static logSystemEvent(action: string, details?: Record<string, unknown>): void {
    logger.info(`SystemAudit: ${action}`, {
      audit: true,
      action,
      ...details,
    });
  }
}

export default AuditLogService;
