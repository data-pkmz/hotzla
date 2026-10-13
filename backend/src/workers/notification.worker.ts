import { NotificationJobStatus, NotificationJobType, type NotificationJob } from '@prisma/client';

import type {
  BudgetApprovalEmailData,
  BudgetDecisionConfirmationEmailData,
  OrderConfirmationEmailData,
  ReadyForPickupEmailData,
} from 'shared-types';

import { prisma } from '../config/db';
import { EmailService } from '../services/email.service';
import { TokenService } from '../services/token.service';
import logger from '../utils/logger';

export class NotificationWorker {
  private static timer: ReturnType<typeof setInterval> | null = null;
  private static isRunning = false;

  private static readonly intervalMs = Number(process.env.NOTIFICATION_POLL_INTERVAL_MS ?? 5000);

  private static readonly batchSize = Number(process.env.NOTIFICATION_BATCH_SIZE ?? 10);

  private static readonly maxAttempts = Number(process.env.NOTIFICATION_MAX_ATTEMPTS ?? 5);

  /**
   * Jobs that remain PROCESSING longer than this timeout are
   * considered abandoned and become eligible for recovery.
   *
   * Default: 5 minutes.
   */
  private static readonly processingTimeoutMs = Number(
    process.env.NOTIFICATION_PROCESSING_TIMEOUT_MS ?? 5 * 60 * 1000
  );

  /**
   * Starts polling for pending and abandoned notification jobs.
   */
  static start(): void {
    if (this.timer) {
      return;
    }

    logger.info('Notification worker started', {
      intervalMs: this.intervalMs,
      batchSize: this.batchSize,
      maxAttempts: this.maxAttempts,
      processingTimeoutMs: this.processingTimeoutMs,
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
   * Processes one batch of available notification jobs.
   *
   * Eligible jobs:
   * - PENDING jobs with remaining attempts.
   * - PROCESSING jobs whose processing timeout has expired.
   *
   * Also marks abandoned PROCESSING jobs as FAILED if they
   * have already exhausted their maximum allowed attempts.
   *
   * isRunning prevents overlapping polling cycles within
   * the same backend process.
   */
  static async runOnce(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const staleProcessingCutoff = new Date(Date.now() - this.processingTimeoutMs);

      /**
       * First, finalize abandoned jobs that have already exhausted
       * their allowed attempts.
       *
       * This handles crashes during the final delivery attempt.
       */
      const exhaustedJobs = await prisma.notificationJob.updateMany({
        where: {
          status: NotificationJobStatus.PROCESSING,
          attempts: {
            gte: this.maxAttempts,
          },
          OR: [
            {
              processingStartedAt: {
                lt: staleProcessingCutoff,
              },
            },
            {
              processingStartedAt: null,
            },
          ],
        },
        data: {
          status: NotificationJobStatus.FAILED,
          processingStartedAt: null,
          lastError: 'Notification processing interrupted after maximum attempts',
        },
      });

      if (exhaustedJobs.count > 0) {
        logger.warn('Marked exhausted notification jobs as failed', {
          count: exhaustedJobs.count,
        });
      }

      /**
       * Find jobs that are ready to be processed.
       *
       * A PROCESSING job is eligible for recovery if:
       * - Its processing timeout has expired, or
       * - Its processing timestamp is null (legacy job).
       */
      const jobs = await prisma.notificationJob.findMany({
        where: {
          attempts: {
            lt: this.maxAttempts,
          },
          OR: [
            {
              status: NotificationJobStatus.PENDING,
            },
            {
              status: NotificationJobStatus.PROCESSING,
              OR: [
                {
                  processingStartedAt: {
                    lt: staleProcessingCutoff,
                  },
                },
                {
                  processingStartedAt: null,
                },
              ],
            },
          ],
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: this.batchSize,
      });

      for (const job of jobs) {
        await this.processJob(job, staleProcessingCutoff);
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
   * Atomically claims and processes one notification job.
   *
   * A claim succeeds only if the job is still PENDING or its
   * previous PROCESSING lease has expired.
   *
   * Updating processingStartedAt when claiming prevents another
   * worker from immediately reclaiming the same job.
   */
  private static async processJob(
    job: NotificationJob,
    staleProcessingCutoff: Date
  ): Promise<void> {
    const wasStaleProcessing = job.status === NotificationJobStatus.PROCESSING;

    const claim = await prisma.notificationJob.updateMany({
      where: {
        id: job.id,
        attempts: {
          lt: this.maxAttempts,
        },
        OR: [
          {
            status: NotificationJobStatus.PENDING,
          },
          {
            status: NotificationJobStatus.PROCESSING,
            OR: [
              {
                processingStartedAt: {
                  lt: staleProcessingCutoff,
                },
              },
              {
                processingStartedAt: null,
              },
            ],
          },
        ],
      },
      data: {
        status: NotificationJobStatus.PROCESSING,
        processingStartedAt: new Date(),
        attempts: {
          increment: 1,
        },
      },
    });

    if (claim.count === 0) {
      return;
    }

    const attemptNumber = job.attempts + 1;

    if (wasStaleProcessing) {
      logger.warn('Recovering abandoned notification job', {
        notificationJobId: job.id,
        orderId: job.orderId,
        type: job.type,
        previousAttempts: job.attempts,
        attempt: attemptNumber,
        previousProcessingStartedAt: job.processingStartedAt,
      });
    }

    try {
      await this.deliver(job);

      await prisma.notificationJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: NotificationJobStatus.SENT,
          processingStartedAt: null,
          processedAt: new Date(),
          lastError: null,
        },
      });

      logger.info('Notification job sent successfully', {
        notificationJobId: job.id,
        orderId: job.orderId,
        type: job.type,
        attempt: attemptNumber,
        recovered: wasStaleProcessing,
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
          processingStartedAt: null,
          lastError: errorMessage,
        },
      });

      logger.error('Notification job delivery failed', {
        notificationJobId: job.id,
        orderId: job.orderId,
        type: job.type,
        attempt: attemptNumber,
        permanentlyFailed,
        recovered: wasStaleProcessing,
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
        await this.deliverBudgetApproval(job);
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

  /**
   * Builds and sends the initial budget-approval email.
   *
   * Checkout stores only a lightweight notification job.
   * The order lookup, token creation, and email construction
   * happen asynchronously instead of blocking checkout.
   */
  private static async deliverBudgetApproval(job: NotificationJob): Promise<void> {
    const order = await prisma.order.findFirst({
      where: {
        id: job.orderId,
        isDeleted: false,
      },
      select: {
        id: true,
        orderNumber: true,
        budgetOfficerEmail: true,
        totalPrice: true,

        requester: {
          select: {
            fullName: true,
          },
        },

        itemEntries: {
          where: {
            isDeleted: false,
          },
          select: {
            quantity: true,
            computedTotalPrice: true,

            product: {
              select: {
                name: true,
              },
            },

            itemAttributeEntries: {
              where: {
                isDeleted: false,
              },
              select: {
                valueText: true,

                attributeDefinition: {
                  select: {
                    attributeName: true,
                  },
                },

                selectedOption: {
                  select: {
                    optionLabel: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order not found for budget approval notification: ${job.orderId}`);
    }

    const approvalToken = await TokenService.getOrCreateApprovalToken(order.id);

    const approvalUrl = `${process.env.APP_BASE_URL}/approve-order?token=${approvalToken}`;

    const emailData: BudgetApprovalEmailData = {
      orderId: order.id,
      orderNumber: order.orderNumber,

      requesterName: order.requester.fullName ?? 'לא צוין שם מזמין',

      budgetOfficerEmail: order.budgetOfficerEmail,

      totalPrice: Number(order.totalPrice),

      approvalUrl,

      items: order.itemEntries.map((item) => ({
        productName: item.product.name,

        quantity: Number(item.quantity),

        price: Number(item.computedTotalPrice),

        specifications: item.itemAttributeEntries.map((attribute) => ({
          name: attribute.attributeDefinition.attributeName,

          value: attribute.selectedOption?.optionLabel ?? attribute.valueText ?? '',
        })),
      })),
    };

    await EmailService.sendBudgetApproval(emailData);
  }
}
