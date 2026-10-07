import { NotificationJobStatus, NotificationJobType, type NotificationJob } from '@prisma/client';

import type {
  BudgetApprovalEmailData,
  BudgetDecisionConfirmationEmailData,
  OrderConfirmationEmailData,
  ReadyForPickupEmailData,
} from 'shared-types';

import { prisma } from '../config/db';
import { EmailService } from '../services/email.service';
import logger from '../utils/logger';

export class NotificationWorker {
  private static timer: ReturnType<typeof setInterval> | null = null;
  private static isRunning = false;

  private static readonly intervalMs = Number(process.env.NOTIFICATION_POLL_INTERVAL_MS ?? 5000);

  private static readonly batchSize = Number(process.env.NOTIFICATION_BATCH_SIZE ?? 10);

  private static readonly maxAttempts = Number(process.env.NOTIFICATION_MAX_ATTEMPTS ?? 5);

  /**
   * Starts polling for pending notification jobs.
   */
  static start(): void {
    if (this.timer) {
      return;
    }

    logger.info('Notification worker started', {
      intervalMs: this.intervalMs,
      batchSize: this.batchSize,
      maxAttempts: this.maxAttempts,
    });

    void this.runOnce();

    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);
  }

  /**
   * Stops the notification worker.
   */
  static stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;

    logger.info('Notification worker stopped');
  }

  /**
   * Processes one batch of pending notification jobs.
   *
   * The isRunning guard prevents overlapping polling cycles inside
   * the same backend process.
   */
  static async runOnce(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const jobs = await prisma.notificationJob.findMany({
        where: {
          status: NotificationJobStatus.PENDING,
          attempts: {
            lt: this.maxAttempts,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: this.batchSize,
      });

      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (error) {
      logger.error('Notification worker polling failed', {
        error,
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Claims and processes one notification job.
   *
   * updateMany is used as an atomic claim: if another worker has already
   * changed the job from PENDING, count will be zero and this worker skips it.
   */
  private static async processJob(job: NotificationJob): Promise<void> {
    const claim = await prisma.notificationJob.updateMany({
      where: {
        id: job.id,
        status: NotificationJobStatus.PENDING,
      },
      data: {
        status: NotificationJobStatus.PROCESSING,
        attempts: {
          increment: 1,
        },
      },
    });

    if (claim.count === 0) {
      return;
    }

    const attemptNumber = job.attempts + 1;

    try {
      await this.deliver(job);

      await prisma.notificationJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: NotificationJobStatus.SENT,
          processedAt: new Date(),
          lastError: null,
        },
      });

      logger.info('Notification job sent successfully', {
        notificationJobId: job.id,
        orderId: job.orderId,
        type: job.type,
        attempt: attemptNumber,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown notification error';

      const permanentlyFailed = attemptNumber >= this.maxAttempts;

      await prisma.notificationJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: permanentlyFailed ? NotificationJobStatus.FAILED : NotificationJobStatus.PENDING,
          lastError: errorMessage,
        },
      });

      logger.error('Notification job delivery failed', {
        notificationJobId: job.id,
        orderId: job.orderId,
        type: job.type,
        attempt: attemptNumber,
        permanentlyFailed,
        error,
      });
    }
  }

  /**
   * Routes a queued notification to the appropriate EmailService method.
   */
  private static async deliver(job: NotificationJob): Promise<void> {
    switch (job.type) {
      case NotificationJobType.ORDER_CONFIRMATION:
        await EmailService.sendOrderConfirmation(
          job.payload as unknown as OrderConfirmationEmailData
        );
        return;

      case NotificationJobType.BUDGET_APPROVAL:
        await EmailService.sendBudgetApproval(job.payload as unknown as BudgetApprovalEmailData);
        return;

      case NotificationJobType.BUDGET_DECISION_CONFIRMATION:
        await EmailService.sendBudgetDecisionConfirmation(
          job.payload as unknown as BudgetDecisionConfirmationEmailData
        );
        return;

      case NotificationJobType.READY_FOR_PICKUP:
        await EmailService.sendReadyForPickup(job.payload as unknown as ReadyForPickupEmailData);
        return;

      default:
        throw new Error(`Unsupported notification job type: ${job.type}`);
    }
  }
}
