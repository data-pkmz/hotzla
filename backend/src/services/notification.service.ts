import { NotificationJobType, Prisma, PrismaClient } from '@prisma/client';

import type { OrderStatus } from 'shared-types';
import type {
  BudgetApprovalEmailData,
  BudgetDecisionConfirmationEmailData,
  ReadyForPickupEmailData,
} from 'shared-types';

import { prisma } from '../config/db';
import logger from '../utils/logger';

type DbClient = Prisma.TransactionClient | PrismaClient;

type NotificationPayload =
  BudgetApprovalEmailData | BudgetDecisionConfirmationEmailData | ReadyForPickupEmailData;

export class NotificationService {
  /**
   * Queues a requester-facing notification for a supported order
   * status transition.
   *
   * No SMTP work is performed here. The notification worker sends
   * the actual email asynchronously.
   */
  static async notifyRequesterStatusChange(
    data: {
      status: OrderStatus;
      orderId: string;
      orderNumber: string;
      requesterEmail: string;
      trackingUrl: string;
      pickupInstructions?: string;
    },
    dbClient: DbClient = prisma
  ): Promise<void> {
    if (data.status !== 'READY_FOR_PICKUP') {
      return;
    }

    const payload: ReadyForPickupEmailData = {
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      requesterEmail: data.requesterEmail,
      pickupInstructions: data.pickupInstructions ?? 'ניתן לאסוף את ההזמנה מבית הדפוס.',
      trackingUrl: data.trackingUrl,
    };

    await this.enqueue(
      NotificationJobType.READY_FOR_PICKUP,
      data.orderId,
      data.orderNumber,
      payload,
      dbClient
    );
  }

  /**
   * Queues a budget-related notification.
   *
   * A new approval request and a budget-decision confirmation use
   * different notification job types so the worker can route each
   * job to the correct EmailService template.
   */
  static async notifyBudgetOfficer(
    data: BudgetApprovalEmailData | BudgetDecisionConfirmationEmailData,
    dbClient: DbClient = prisma
  ): Promise<void> {
    const type =
      'decision' in data
        ? NotificationJobType.BUDGET_DECISION_CONFIRMATION
        : NotificationJobType.BUDGET_APPROVAL;

    await this.enqueue(type, data.orderId, data.orderNumber, data, dbClient);
  }

  /**
   * Persists a notification job.
   *
   * This performs only database work. The calling HTTP request does
   * not wait for SMTP delivery.
   */
  private static async enqueue(
    type: NotificationJobType,
    orderId: string,
    orderNumber: string,
    payload: NotificationPayload,
    dbClient: DbClient
  ): Promise<void> {
    await dbClient.notificationJob.create({
      data: {
        type,
        status: 'PENDING',
        payload: payload as unknown as Prisma.InputJsonValue,
        order: {
          connect: {
            id: orderId,
          },
        },
      },
    });

    logger.info('Notification queued', {
      type,
      orderId,
      orderNumber,
    });
  }
}
