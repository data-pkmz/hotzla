import { Status } from '@prisma/client';

import { prisma } from '../config/db';
import logger from '../utils/logger';

// This job marks stale active carts as ABANDONED instead of deleting them.
// The goal is to keep historical data for recovery or reporting while
// removing carts that are no longer relevant to the user.
export interface CartCleanupJobOptions {
  thresholdDays?: number;
}

export class CartCleanupJob {
  // Runs the cleanup routine. By default, any ACTIVE cart not updated for
  // 14 days will be marked as ABANDONED.
  static async runCleanupJob(options: CartCleanupJobOptions = {}) {
    // Read the threshold from the caller or from the environment. This makes
    // the job reusable in tests and in different deployment environments.
    const thresholdDays =
      options.thresholdDays ?? Number(process.env.CART_CLEANUP_THRESHOLD_DAYS ?? 14);

    // A cart is considered stale when its updatedAt timestamp is older than N days.
    const cutoffDate = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

    // First, find only carts that still qualify for cleanup. We explicitly limit
    // the query to ACTIVE carts that were not soft-deleted and have not been touched
    // recently.
    const candidates = await prisma.cart.findMany({
      where: {
        status: Status.ACTIVE,
        isDeleted: false,
        updatedAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
        userId: true,
        updatedAt: true,
      },
    });

    // Update the stale carts in one batch to ABANDONED. This keeps the data in the
    // database but prevents the cart from being treated as an active cart.
    const result = await prisma.cart.updateMany({
      where: {
        id: {
          in: candidates.map((cart) => cart.id),
        },
        status: Status.ACTIVE,
        isDeleted: false,
        updatedAt: {
          lt: cutoffDate,
        },
      },
      data: {
        status: Status.ABANDONED,
        updatedAt: new Date(),
      },
    });

    // Log the entire execution result so we can review runtime behavior in the logs
    // without needing to inspect the database manually.
    logger.info('Cart cleanup job completed', {
      thresholdDays,
      candidateCount: candidates.length,
      updatedCount: result.count,
      cutoffAt: cutoffDate.toISOString(),
    });

    // Return a structured summary for tests or for future scheduler metrics.
    return {
      thresholdDays,
      candidateCount: candidates.length,
      updatedCount: result.count,
      cutoffAt: cutoffDate.toISOString(),
    };
  }
}

export default CartCleanupJob;
