import type { OrderStatusHistory, LogStatusChangeParams } from 'shared-types';
import { prisma } from '../config/db';
import logger from '../utils/logger';

export type { LogStatusChangeParams };

export class AuditLogService {
  /**
   * Records an order status change event in database and system logs.
   */
  public static async logStatusChange(params: LogStatusChangeParams): Promise<OrderStatusHistory> {
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

    const record = await prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus,
        toStatus,
        changedByUserId,
        changedBySource,
        note,
      },
    });

    return record;
  }

  /**
   * Fetches status history timeline for a specific order.
   */
  public static async getStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    return prisma.orderStatusHistory.findMany({
      where: { orderId },
      orderBy: { changedAt: 'asc' },
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
   * Logs a generic critical system audit event.
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
