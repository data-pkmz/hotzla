import fs from 'node:fs/promises';
import path from 'node:path';

import nodemailer from 'nodemailer';

import type {
  BudgetApprovalEmailData,
  EmailType,
  OrderConfirmationEmailData,
  ReadyForPickupEmailData,
  BudgetDecisionConfirmationEmailData,
} from 'shared-types';

import { prisma } from '../config/db';
import logger from '../utils/logger';

/**
 * Data required by the internal email-sending helper.
 */
interface SendEmailParams {
  /** ID of the order associated with the email. */
  orderId: string;

  /** Application email type used for EmailLog records. */
  type: EmailType;

  /** Recipient email address. */
  to: string;

  /** Email subject line. */
  subject: string;

  /** Fully rendered HTML email body. */
  html: string;

  /** Optional Message-ID of the email being replied to. */
  inReplyTo?: string;

  /** Optional list of Message-IDs used to preserve the email thread. */
  references?: string[];
}

export class EmailService {
  /**
   * Nodemailer SMTP transport used for all outbound application emails.
   *
   * SMTP connection details are read from environment variables.
   *
   * SMTP_REJECT_UNAUTHORIZED should only be set to "false" in controlled
   * development/test environments that require accepting an untrusted
   * certificate. Production should normally leave certificate validation enabled.
   */
  private static readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    },
  });

  /**
   * Verifies that the configured SMTP server can be reached and authenticated.
   *
   * Expects:
   * - SMTP configuration to be available through environment variables.
   * - SMTP_HOST and SMTP_PORT to identify the mail server.
   * - SMTP_USER and SMTP_PASSWORD when authenticated SMTP is required.
   *
   * Does:
   * - Logs the non-secret SMTP configuration for debugging.
   * - Calls Nodemailer's transporter.verify() to test the SMTP connection.
   * - Logs whether the connection verification succeeded or failed.
   *
   * Returns:
   * - Nothing when the SMTP connection is successfully verified.
   *
   * Throws:
   * - The SMTP/Nodemailer error when the connection cannot be verified.
   */
  static async verifyConnection(): Promise<void> {
    try {
      logger.info('SMTP configuration', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE,
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM,
        passwordSet: Boolean(process.env.SMTP_PASSWORD),
      });

      await this.transporter.verify();

      logger.info('SMTP connection verified successfully');
    } catch (error) {
      logger.error('SMTP verification failed', {
        message: error instanceof Error ? error.message : String(error),
        error,
      });

      throw error;
    }
  }

  /**
   * Sends a budget approval request to the order's budget officer.
   *
   * Expects:
   * - data.orderId: ID of the order requiring approval.
   * - data.orderNumber: Human-readable order number.
   * - data.requesterName: Name of the requester.
   * - data.budgetOfficerEmail: Recipient email address.
   * - data.totalPrice: Total price requiring approval.
   * - data.items: Ordered products and their specifications.
   * - data.approvalUrl: Public token-based URL that allows the budget
   *   officer to review and approve/reject the order without signing in.
   *
   * Does:
   * - Loads the budget approval HTML template.
   * - Renders the order's products and specifications.
   * - Inserts the order information and public approval URL into the template.
   * - Escapes dynamic values before inserting them into HTML.
   * - Sends the rendered email through the shared sendEmail helper.
   *
   * Sends:
   * - An outbound BUDGET_APPROVAL email to the budget officer.
   *
   * Throws:
   * - Any template-loading or email-sending error.
   */
  static async sendBudgetApproval(data: BudgetApprovalEmailData): Promise<void> {
    const template = await this.loadTemplate('budget-approval.html');

    const orderItemsHtml = this.renderOrderItems(data.items);

    const html = this.renderTemplate(template, {
      orderNumber: this.escapeHtml(data.orderNumber),
      requesterName: this.escapeHtml(data.requesterName),
      orderItems: orderItemsHtml,
      totalPrice: this.formatPrice(data.totalPrice),
      approvalUrl: this.escapeHtml(data.approvalUrl),
    });

    const subject =
      `אישור תקציבי נדרש להזמנת הוצאה לאור מספר ` + `${data.orderNumber} – ${data.requesterName}`;

    await this.sendEmail({
      orderId: data.orderId,
      type: 'BUDGET_APPROVAL',
      to: data.budgetOfficerEmail,
      subject,
      html,
    });
  }

  /**
   * Sends confirmation that an order was successfully received.
   *
   * Expects:
   * - data.orderId: ID of the created order.
   * - data.orderNumber: Human-readable order number.
   * - data.requesterEmail: Requester's email address.
   * - data.trackingUrl: URL where the requester can view their orders.
   *
   * Does:
   * - Loads the order-confirmation HTML template.
   * - Inserts the order number and tracking URL.
   * - Sends the rendered email through sendEmail.
   *
   * Sends:
   * - An outbound ORDER_CONFIRMATION email to the requester.
   *
   * Throws:
   * - Any template-loading or email-sending error.
   */
  static async sendOrderConfirmation(data: OrderConfirmationEmailData): Promise<void> {
    const template = await this.loadTemplate('order-confirmation.html');

    const html = this.renderTemplate(template, {
      orderNumber: this.escapeHtml(data.orderNumber),
      trackingUrl: this.escapeHtml(data.trackingUrl),
    });

    const subject = `אישור קבלת הזמנה מספר ${data.orderNumber}`;

    await this.sendEmail({
      orderId: data.orderId,
      type: 'ORDER_CONFIRMATION',
      to: data.requesterEmail,
      subject,
      html,
    });
  }

  /**
   * Notifies the requester that their order is ready for pickup.
   *
   * Expects:
   * - data.orderId: ID of the order.
   * - data.orderNumber: Human-readable order number.
   * - data.requesterEmail: Requester's email address.
   * - data.pickupInstructions: Instructions for collecting the order.
   * - data.trackingUrl: URL where the requester can view the order.
   *
   * Does:
   * - Loads the ready-for-pickup HTML template.
   * - Inserts the order number, pickup instructions, and tracking URL.
   * - Sends the rendered email through sendEmail.
   *
   * Sends:
   * - An outbound READY_FOR_PICKUP email to the requester.
   *
   * Throws:
   * - Any template-loading or email-sending error.
   */
  static async sendReadyForPickup(data: ReadyForPickupEmailData): Promise<void> {
    const template = await this.loadTemplate('ready-for-pickup.html');

    const html = this.renderTemplate(template, {
      orderNumber: this.escapeHtml(data.orderNumber),
      pickupInstructions: this.escapeHtml(data.pickupInstructions),
      trackingUrl: this.escapeHtml(data.trackingUrl),
    });

    const subject = `הזמנה מספר ${data.orderNumber} מוכנה לאיסוף`;

    await this.sendEmail({
      orderId: data.orderId,
      type: 'READY_FOR_PICKUP',
      to: data.requesterEmail,
      subject,
      html,
    });
  }

  /**
   * Sends confirmation of a budget decision back to the budget officer.
   *
   * Expects:
   * - data.orderId: ID of the affected order.
   * - data.orderNumber: Human-readable order number.
   * - data.budgetOfficerEmail: Recipient email address.
   * - data.decision: Budget decision, APPROVED or REJECTED.
   * - data.originalSubject: Optional subject of the original incoming email.
   * - data.inReplyTo: Optional Message-ID of the original email.
   * - data.references: Optional email Message-ID chain.
   *
   * Does:
   * - Converts the decision into Hebrew display text.
   * - Loads and renders the budget-decision confirmation template.
   * - Preserves the original email subject/thread information when available.
   * - Sends the confirmation through sendEmail.
   *
   * Sends:
   * - An outbound BUDGET_DECISION_CONFIRMATION email to the budget officer.
   *
   * Throws:
   * - Any template-loading or email-sending error.
   */
  static async sendBudgetDecisionConfirmation(
    data: BudgetDecisionConfirmationEmailData
  ): Promise<void> {
    const template = await this.loadTemplate('budget-decision-confirmation.html');

    const decisionText = data.decision === 'APPROVED' ? 'מאושר' : 'נדחה';

    const html = this.renderTemplate(template, {
      orderNumber: this.escapeHtml(data.orderNumber),
      decisionText: this.escapeHtml(decisionText),
    });

    const subject = data.originalSubject
      ? data.originalSubject.toLowerCase().startsWith('re:')
        ? data.originalSubject
        : `RE: ${data.originalSubject}`
      : `RE: ${data.orderNumber}`;

    await this.sendEmail({
      orderId: data.orderId,
      type: 'BUDGET_DECISION_CONFIRMATION',
      to: data.budgetOfficerEmail,
      subject,
      html,
      inReplyTo: data.inReplyTo,
      references: data.references,
    });
  }

  /**
   * Sends a rendered HTML email through SMTP and records the result.
   *
   * Expects:
   * - orderId: Order associated with the email.
   * - type: Application email type.
   * - to: Recipient email address.
   * - subject: Email subject.
   * - html: Rendered HTML body.
   * - inReplyTo: Optional Message-ID when sending a threaded reply.
   * - references: Optional Message-ID chain for email threading.
   *
   * Does:
   * - Resolves the configured sender address.
   * - Sends the email through Nodemailer.
   * - Creates an OUTBOUND EmailLog record after successful sending.
   * - Logs the SMTP Message-ID for successful sends.
   * - Attempts to create an ERROR EmailLog when sending fails.
   *
   * Returns:
   * - Nothing when sending and logging complete successfully.
   *
   * Throws:
   * - The original email-sending error when SMTP delivery fails.
   * - An error if SMTP_FROM is not configured.
   */
  private static async sendEmail({
    orderId,
    type,
    to,
    subject,
    html,
    inReplyTo,
    references,
  }: SendEmailParams): Promise<void> {
    const from = this.getFromAddress();

    try {
      const result = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
        inReplyTo,
        references,
      });

      await prisma.emailLog.create({
        data: {
          orderId,
          direction: 'OUTBOUND',
          type,
          toAddress: to,
          fromAddress: from,
          subject,
          processedStatus: 'PENDING',
        },
      });

      logger.info('Email sent successfully', {
        orderId,
        type,
        to,
        subject,
        messageId: result.messageId,
      });
    } catch (error) {
      logger.error('Failed to send email', {
        orderId,
        type,
        to,
        subject,
        error,
      });

      try {
        await prisma.emailLog.create({
          data: {
            orderId,
            direction: 'OUTBOUND',
            type,
            toAddress: to,
            fromAddress: from,
            subject,
            processedStatus: 'ERROR',
          },
        });
      } catch (logError) {
        logger.error('Failed to create email error log', {
          orderId,
          type,
          to,
          subject,
          logError,
        });
      }

      throw error;
    }
  }

  /**
   * Loads an HTML email template from the application's email-template folder.
   *
   * Expects:
   * - templateName: Filename of a template inside src/templates/emails.
   *
   * Does:
   * - Resolves the absolute template path from the current working directory.
   * - Reads the template as UTF-8 text.
   *
   * Returns:
   * - The unrendered HTML template.
   *
   * Throws:
   * - A filesystem error if the template cannot be found or read.
   */
  private static async loadTemplate(templateName: string): Promise<string> {
    const templatePath = path.resolve(process.cwd(), 'src', 'templates', 'emails', templateName);

    return fs.readFile(templatePath, 'utf8');
  }

  /**
   * Replaces {{variable}} placeholders in an HTML template.
   *
   * Expects:
   * - template: HTML template containing named placeholders.
   * - variables: Mapping of placeholder names to rendered string values.
   *
   * Does:
   * - Replaces every occurrence of each matching placeholder.
   *
   * Returns:
   * - The rendered HTML string.
   */
  private static renderTemplate(template: string, variables: Record<string, string>): string {
    return Object.entries(variables).reduce(
      (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
      template
    );
  }

  /**
   * Builds the variable-length order-item section used by the
   * budget approval email.
   *
   * Expects:
   * - items: Products included in the order together with quantities,
   *   prices, and configured specifications.
   *
   * Does:
   * - Renders each product and its selected specifications as HTML.
   * - Escapes all dynamic product/specification text before insertion.
   * - Formats each item's price to two decimal places.
   *
   * Returns:
   * - HTML representing all order items.
   */
  private static renderOrderItems(items: BudgetApprovalEmailData['items']): string {
    return items
      .map((item) => {
        const specifications = item.specifications
          .map(
            (specification) =>
              `<li><strong>${this.escapeHtml(specification.name)}:</strong> ${this.escapeHtml(
                specification.value
              )}</li>`
          )
          .join('');

        return `
          <div style="margin-bottom: 16px;">
            <div>
              <strong>${this.escapeHtml(item.productName)}</strong>
              × ${item.quantity}
              – ${this.formatPrice(item.price)} ₪
            </div>

            ${specifications ? `<ul style="margin-top: 8px;">${specifications}</ul>` : ''}
          </div>
        `;
      })
      .join('');
  }

  /**
   * Retrieves the configured sender email address.
   *
   * Expects:
   * - SMTP_FROM to be configured in the environment.
   *
   * Returns:
   * - The configured sender email address.
   *
   * Throws:
   * - An error when SMTP_FROM is missing.
   */
  private static getFromAddress(): string {
    const fromAddress = process.env.SMTP_FROM;

    if (!fromAddress) {
      throw new Error('SMTP_FROM is not configured');
    }

    return fromAddress;
  }

  /**
   * Formats a numeric price for display in emails.
   *
   * Expects:
   * - price: Numeric monetary value.
   *
   * Returns:
   * - The price formatted with exactly two decimal places.
   */
  private static formatPrice(price: number): string {
    return price.toFixed(2);
  }

  /**
   * Escapes dynamic text before inserting it into an HTML email.
   *
   * Expects:
   * - value: Untrusted or dynamic string that may contain HTML characters.
   *
   * Does:
   * - Replaces HTML-sensitive characters with their corresponding entities.
   *
   * Returns:
   * - A string safe to insert into the generated HTML.
   */
  private static escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
