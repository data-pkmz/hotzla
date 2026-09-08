import type { EmailOrderItem } from './email.types.js';

/**
 * Payload required to notify the configured manager about a newly created order.
 *
 * The recipient is kept in the payload type because EmailService needs a
 * concrete address, while NotificationService normally resolves it from the
 * MANAGER_EMAIL environment variable before delegating the send operation.
 */
export interface ManagerNewOrderNotificationData {
  /** Internal order identifier used for logging and EMAIL_LOG correlation. */
  orderId: string;
  /** Human-readable order number shown in the email subject and body. */
  orderNumber: string;
  /** Name displayed to the manager as the person who created the order. */
  requesterName: string;
  /** Destination mailbox for the manager notification. */
  managerEmail: string;
  /** Order total displayed in the notification. */
  totalPrice: number;
  /** Ordered products available for future richer manager templates. */
  items: EmailOrderItem[];
  /** Link that lets the manager open the order details page. */
  orderUrl: string;
}
