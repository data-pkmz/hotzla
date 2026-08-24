import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/db.js';

export type DbClient = Prisma.TransactionClient | PrismaClient;

export class OrderNumberGenerator {
  /**
   * Generates the next sequential order number for the given calendar year in the format YYYY-NNNN (e.g., 2026-0001).
   *
   * The sequence resets at the beginning of each calendar year.
   *
   * @param dbClient - Optional Prisma client or transaction client.
   * @param targetYear - Optional target year (defaults to current calendar year).
   */
  public static async generateNextOrderNumber(
    dbClient: DbClient = defaultPrisma,
    targetYear?: number
  ): Promise<string> {
    const year = targetYear ?? new Date().getFullYear();
    const yearPrefix = `${year}-`;

    const latestOrder = await dbClient.order.findFirst({
      where: {
        orderNumber: {
          startsWith: yearPrefix,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
      select: {
        orderNumber: true,
      },
    });

    let nextSequence = 1;

    if (latestOrder && latestOrder.orderNumber) {
      const parts = latestOrder.orderNumber.split('-');
      if (parts.length >= 2) {
        const lastSequenceNumber = parseInt(parts[1], 10);
        if (!isNaN(lastSequenceNumber) && lastSequenceNumber >= 0) {
          nextSequence = lastSequenceNumber + 1;
        }
      }
    }

    const paddedSequence = String(nextSequence).padStart(4, '0');
    return `${year}-${paddedSequence}`;
  }
}
