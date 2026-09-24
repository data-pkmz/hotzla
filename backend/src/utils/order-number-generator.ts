import { Prisma, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../config/db';

export type DbClient = Prisma.TransactionClient | PrismaClient;

interface OrderNumberCounterRow {
  lastValue: number;
}

export class OrderNumberGenerator {
  /**
   * Generates the next sequential order number for the given calendar year
   * in the format YYYY-NNNN (for example, 2026-0001).
   *
   * Each year has its own counter in the order_number_counters table.
   *
   * The counter is incremented atomically by PostgreSQL, preventing two
   * concurrent requests from receiving the same order number.
   *
   * If no counter exists for the requested year, the first generated
   * sequence number is 1.
   *
   * @param dbClient - Optional Prisma client or transaction client.
   * @param targetYear - Optional target year. Defaults to the current year.
   */
  public static async generateNextOrderNumber(
    dbClient: DbClient = defaultPrisma,
    targetYear?: number
  ): Promise<string> {
    const year = targetYear ?? new Date().getFullYear();

    const rows = await dbClient.$queryRaw<OrderNumberCounterRow[]>`
      INSERT INTO "order_number_counters" ("year", "last_value")
      VALUES (${year}, 1)
      ON CONFLICT ("year")
      DO UPDATE
      SET "last_value" = "order_number_counters"."last_value" + 1
      RETURNING "last_value" AS "lastValue"
    `;

    const nextSequence = rows[0]?.lastValue;

    if (nextSequence === undefined) {
      throw new Error('Failed to generate the next order number');
    }

    const paddedSequence = String(nextSequence).padStart(4, '0');

    return `${year}-${paddedSequence}`;
  }
}
