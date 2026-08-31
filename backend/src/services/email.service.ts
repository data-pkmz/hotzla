import fs from 'node:fs/promises';
import path from 'node:path';

import nodemailer from 'nodemailer';

import type {
  BudgetApprovalEmailData,
  EmailType,
  OrderConfirmationEmailData,
  ReadyForPickupEmailData,
} from 'shared-types';

import { prisma } from '../config/db';
import logger from '../utils/logger';

interface SendEmailParams {
  orderId: string;
  type: EmailType;
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
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
    /*
     * FOR TESTING ONLY REMOVE BEFORE PRODUCTION
     */
    tls: {
      rejectUnauthorized: false,
    },
  });

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
   * Sends a budget approval request to the budget officer.
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
   * Sends an order receipt confirmation to the requester.
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
   * Notifies the requester that the order is ready for pickup.
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
   * Sends the email through SMTP and records the result in EMAIL_LOG.
   */
  private static async sendEmail({
    orderId,
    type,
    to,
    subject,
    html,
  }: SendEmailParams): Promise<void> {
    const from = this.getFromAddress();

    try {
      const result = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
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
   * Loads an HTML email template from src/templates/emails.
   */
  private static async loadTemplate(templateName: string): Promise<string> {
    const templatePath = path.resolve(process.cwd(), 'src', 'templates', 'emails', templateName);

    return fs.readFile(templatePath, 'utf8');
  }

  /**
   * Replaces {{variable}} placeholders inside an HTML template.
   */
  private static renderTemplate(template: string, variables: Record<string, string>): string {
    return Object.entries(variables).reduce(
      (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
      template
    );
  }

  /**
   * Builds the variable-length product/specification section used by
   * the budget approval email.
   */
  private static renderOrderItems(items: BudgetApprovalEmailData['items']): string {
    return items
      .map((item) => {
        const specifications = item.specifications
          .map(
            (specification) =>
              `<li><strong>${this.escapeHtml(
                specification.name
              )}:</strong> ${this.escapeHtml(specification.value)}</li>`
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

  private static getFromAddress(): string {
    const fromAddress = process.env.SMTP_FROM;

    if (!fromAddress) {
      throw new Error('SMTP_FROM is not configured');
    }

    return fromAddress;
  }

  private static formatPrice(price: number): string {
    return price.toFixed(2);
  }

  /**
   * Escapes dynamic text before inserting it into HTML templates.
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
