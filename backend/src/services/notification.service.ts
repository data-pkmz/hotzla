import type { OrderStatus } from 'shared-types';
import type {
  BudgetApprovalEmailData,
  BudgetDecisionConfirmationEmailData,
  OrderConfirmationEmailData,
  ReadyForPickupEmailData,
} from 'shared-types';

import { EmailService } from './email.service';
import logger from '../utils/logger';

export class NotificationService {
  /**
   * Sends a requester-facing email for a status transition.
   *
   * Only statuses with an implemented email template are sent. This keeps the
   * method safe while the notification catalog grows and avoids pretending
   * that every internal status has a user-facing message already.
   */
  static async notifyRequesterStatusChange(data: {
    status: OrderStatus;
    orderId: string;
    orderNumber: string;
    requesterEmail: string;
    trackingUrl: string;
    pickupInstructions?: string;
  }): Promise<void> {
    if (data.status === 'READY_FOR_PICKUP') {
      const email: ReadyForPickupEmailData = {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        requesterEmail: data.requesterEmail,
        pickupInstructions: data.pickupInstructions ?? 'ניתן לאסוף את ההזמנה מבית הדפוס.',
        trackingUrl: data.trackingUrl,
      };
      await this.send('requester status change', data.orderId, data.orderNumber, () =>
        EmailService.sendReadyForPickup(email)
      );
    }
  }

  /**
   * Routes budget-related events to the matching EmailService template.
   *
   * The discriminating "decision" property distinguishes an inbound budget
   * decision reply from a new budget approval request without duplicating the
   * public API into two nearly identical methods.
   */
  static async notifyBudgetOfficer(
    data: BudgetApprovalEmailData | BudgetDecisionConfirmationEmailData
  ): Promise<void> {
    await this.send('budget officer notification', data.orderId, data.orderNumber, () =>
      'decision' in data
        ? EmailService.sendBudgetDecisionConfirmation(data)
        : EmailService.sendBudgetApproval(data)
    );
  }

  /**
   * Sends the receipt that confirms an order was accepted by the system.
   *
   * This method is intentionally separate from status-change notifications:
   * order creation is an event, while a later status transition is a state
   * update.
   */
  static async notifyRequesterOrderReceived(data: OrderConfirmationEmailData): Promise<void> {
    await this.send('requester order confirmation', data.orderId, data.orderNumber, () =>
      EmailService.sendOrderConfirmation(data)
    );
  }

  /**
   * Executes one email delivery and applies consistent observability.
   *
   * EmailService remains responsible for SMTP, templates, and EMAIL_LOG.
   * This wrapper adds the business-level event and channel context, then
   * rethrows failures so the caller can apply its existing error policy.
   */
  private static async send(
    event: string,
    orderId: string,
    orderNumber: string,
    sendEmail: () => Promise<void>
  ): Promise<void> {
    try {
      await sendEmail();
      logger.info('Notification sent successfully', {
        event,
        channel: 'email',
        orderId,
        orderNumber,
      });
    } catch (error) {
      logger.error('Notification delivery failed', {
        event,
        channel: 'email',
        orderId,
        orderNumber,
        error,
      });
      throw error;
    }
  }
}
