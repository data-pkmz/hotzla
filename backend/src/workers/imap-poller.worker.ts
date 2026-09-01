import { ChangeSource, OrderStatus } from '@prisma/client';

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

import { prisma } from '../config/db';
import logger from '../utils/logger';

import { EmailParserService } from '../services/email-parser.service';
import { EmailService } from '../services/email.service';

export class ImapPollingWorker {
  private static intervalId: NodeJS.Timeout | null = null;

  private static isRunning = false;

  private static readonly pollIntervalMs = Number(process.env.IMAP_POLL_INTERVAL_MS ?? 120000);

  static start(): void {
    if (this.intervalId) {
      logger.warn('IMAP polling worker is already running');
      return;
    }

    logger.info('Starting IMAP polling worker', {
      intervalMs: this.pollIntervalMs,
    });

    void this.poll();

    this.intervalId = setInterval(() => {
      void this.poll();
    }, this.pollIntervalMs);
  }

  static stop(): void {
    if (!this.intervalId) {
      return;
    }

    clearInterval(this.intervalId);

    this.intervalId = null;

    logger.info('IMAP polling worker stopped');
  }

  static async runOnce(): Promise<void> {
    await this.poll();
  }

  private static async poll(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Skipping IMAP poll because previous poll is still running');

      return;
    }

    this.isRunning = true;

    const client = this.createClient();

    try {
      await client.connect();

      const lock = await client.getMailboxLock('INBOX');

      try {
        const searchResult = await client.search({
          seen: false,
        });

        const unseenMessages = searchResult || [];

        logger.info('IMAP poll completed search', {
          messageCount: unseenMessages.length,
        });

        for (const uid of unseenMessages) {
          try {
            await this.processMessage(client, uid);

            await client.messageFlagsAdd({ uid }, ['\\Seen'], {
              uid: true,
            });
          } catch (error) {
            logger.error('Failed to process inbound email', {
              uid,
              error,
            });
          }
        }
      } finally {
        lock.release();
      }
    } catch (error) {
      logger.error('IMAP polling failed', {
        error,
      });
    } finally {
      try {
        await client.logout();
      } catch {
        // Client may already be disconnected.
      }

      this.isRunning = false;
    }
  }

  private static async processMessage(client: ImapFlow, uid: number): Promise<void> {
    const message = await client.fetchOne(
      uid,
      {
        source: true,
        envelope: true,
      },
      {
        uid: true,
      }
    );

    if (!message || !message.source) {
      throw new Error(`Unable to fetch source for IMAP UID ${uid}`);
    }

    const parsedMail = await simpleParser(message.source);
    const incomingMessageId = parsedMail.messageId;

    const senderEmail = parsedMail.from?.value?.[0]?.address;

    if (!senderEmail) {
      await prisma.emailLog.create({
        data: {
          orderId: null,
          direction: 'INBOUND',
          type: 'INBOUND_OTHER',
          toAddress: process.env.IMAP_USER ?? '',
          fromAddress: '',
          subject: parsedMail.subject ?? '',
          processedStatus: 'ERROR',
        },
      });

      logger.warn('Inbound email sender address is missing', {
        uid,
        subject: parsedMail.subject,
      });

      return;
    }

    const parsed = EmailParserService.parse({
      senderEmail,
      subject: parsedMail.subject,
      body: parsedMail.text,
    });

    if (!parsed.orderNumber) {
      await prisma.emailLog.create({
        data: {
          orderId: null,
          direction: 'INBOUND',
          type: 'INBOUND_OTHER',
          toAddress: process.env.IMAP_USER ?? '',
          fromAddress: parsed.senderEmail,
          subject: parsed.subject,
          processedStatus: 'PENDING',
        },
      });

      logger.warn('Inbound email does not contain an order number', {
        uid,
        senderEmail: parsed.senderEmail,
        subject: parsed.subject,
      });

      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        orderNumber: parsed.orderNumber,
        isDeleted: false,
      },
    });

    if (!order) {
      await prisma.emailLog.create({
        data: {
          orderId: null,
          direction: 'INBOUND',
          type: 'INBOUND_OTHER',
          toAddress: process.env.IMAP_USER ?? '',
          fromAddress: parsed.senderEmail,
          subject: parsed.subject,
          processedStatus: 'PENDING',
        },
      });

      logger.warn('Inbound email references unknown order', {
        uid,
        orderNumber: parsed.orderNumber,
        senderEmail: parsed.senderEmail,
      });

      return;
    }

    const senderMatchesBudgetOfficer =
      EmailParserService.normalizeEmail(order.budgetOfficerEmail) === parsed.senderEmail;

    if (!senderMatchesBudgetOfficer) {
      await prisma.emailLog.create({
        data: {
          orderId: order.id,
          direction: 'INBOUND',
          type: 'INBOUND_REPLY',
          toAddress: process.env.IMAP_USER ?? '',
          fromAddress: parsed.senderEmail,
          subject: parsed.subject,
          processedStatus: 'ERROR',
        },
      });

      logger.warn('Inbound email sender does not match budget officer', {
        uid,
        orderId: order.id,
        orderNumber: order.orderNumber,
        senderEmail: parsed.senderEmail,
        expectedEmail: order.budgetOfficerEmail,
      });

      return;
    }

    if (order.status !== OrderStatus.PENDING_BUDGET) {
      await prisma.emailLog.create({
        data: {
          orderId: order.id,
          direction: 'INBOUND',
          type: 'INBOUND_REPLY',
          toAddress: process.env.IMAP_USER ?? '',
          fromAddress: parsed.senderEmail,
          subject: parsed.subject,
          processedStatus: 'ERROR',
        },
      });

      logger.warn('Inbound budget response ignored because order is not pending budget approval', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        currentStatus: order.status,
      });

      return;
    }

    if (parsed.decision === 'UNKNOWN') {
      await prisma.emailLog.create({
        data: {
          orderId: order.id,
          direction: 'INBOUND',
          type: 'INBOUND_REPLY',
          toAddress: process.env.IMAP_USER ?? '',
          fromAddress: parsed.senderEmail,
          subject: parsed.subject,
          processedStatus: 'PENDING',
        },
      });

      logger.info('Inbound budget response contained no unambiguous decision', {
        orderId: order.id,
        orderNumber: order.orderNumber,
      });

      return;
    }

    const nextStatus =
      parsed.decision === 'APPROVED' ? OrderStatus.BUDGET_APPROVED : OrderStatus.REJECTED;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: nextStatus,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING_BUDGET,
          toStatus: nextStatus,
          changedByUserId: null,
          changedBySource: ChangeSource.EMAIL_BUDGET_OFFICER,
          note:
            parsed.decision === 'APPROVED'
              ? 'האישור התקציבי התקבל במייל.'
              : 'ההזמנה נדחתה על ידי קצין התקציב במייל.',
        },
      });

      await tx.emailLog.create({
        data: {
          orderId: order.id,
          direction: 'INBOUND',
          type: 'INBOUND_REPLY',
          toAddress: process.env.IMAP_USER ?? '',
          fromAddress: parsed.senderEmail,
          subject: parsed.subject,
          processedStatus: parsed.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        },
      });
    });

    try {
      await EmailService.sendBudgetDecisionConfirmation({
        orderId: order.id,
        orderNumber: order.orderNumber,
        budgetOfficerEmail: order.budgetOfficerEmail,
        decision: parsed.decision,
        inReplyTo: incomingMessageId,
        references: incomingMessageId ? [incomingMessageId] : undefined,
        originalSubject: parsed.subject,
      });
    } catch (error) {
      logger.error('Failed to send budget decision confirmation email', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        error,
      });
    }

    logger.info('Inbound budget response processed successfully', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      decision: parsed.decision,
      newStatus: nextStatus,
    });
  }

  private static createClient(): ImapFlow {
    const host = process.env.IMAP_HOST;
    const user = process.env.IMAP_USER;
    const password = process.env.IMAP_PASSWORD;

    if (!host) {
      throw new Error('IMAP_HOST is not configured');
    }

    if (!user) {
      throw new Error('IMAP_USER is not configured');
    }

    if (!password) {
      throw new Error('IMAP_PASSWORD is not configured');
    }

    return new ImapFlow({
      host,
      port: Number(process.env.IMAP_PORT ?? 993),
      secure: process.env.IMAP_SECURE !== 'false',

      auth: {
        user,
        pass: password,
      },

      tls: {
        rejectUnauthorized: process.env.IMAP_REJECT_UNAUTHORIZED !== 'false',
      },

      logger: false,
    });
  }
}
