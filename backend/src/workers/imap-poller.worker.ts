import { ChangeSource, OrderStatus } from '@prisma/client';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

import { prisma } from '../config/db';
import logger from '../utils/logger';

import { EmailParserService } from '../services/email-parser.service';
import { NotificationService } from '../services/notification.service';
import { ApprovalService } from '../services/approval.service';

type MessageOutcome = 'PROCESSED' | 'REVIEW';

export class ImapPollingWorker {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;

  private static readonly pollIntervalMs = Number(process.env.IMAP_POLL_INTERVAL_MS ?? 120000);

  static start(): void {
    if (this.intervalId) {
      logger.warn('IMAP polling worker is already running');
      return;
    }

    try {
      this.validateAuthenticationConfig();
    } catch (error) {
      logger.warn('IMAP polling worker disabled: sender authentication is not configured', {
        error: error instanceof Error ? error.message : String(error),
      });

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
    this.validateAuthenticationConfig();
    await this.poll();
  }

  /**
   * Requires an explicitly trusted receiving authentication service.
   *
   * Authentication-Results headers are not inherently trustworthy.
   * The mail infrastructure MUST remove forged inbound instances
   * claiming the trusted authserv-id before adding its own results.
   *
   * IMAP_AUTH_RESULTS_TRUST_VERIFIED is an administrator assertion
   * that the above requirement has been checked.
   */
  private static validateAuthenticationConfig(): void {
    const authservId = process.env.IMAP_TRUSTED_AUTHSERV_ID?.trim();

    if (!authservId) {
      throw new Error(
        'IMAP_TRUSTED_AUTHSERV_ID must be configured before enabling email approvals'
      );
    }

    if (!/^[a-z0-9][a-z0-9.-]*$/i.test(authservId)) {
      throw new Error('IMAP_TRUSTED_AUTHSERV_ID has an invalid format');
    }

    if (process.env.IMAP_AUTH_RESULTS_TRUST_VERIFIED !== 'true') {
      throw new Error(
        'Email approvals disabled: trusted Authentication-Results handling has not been verified'
      );
    }
  }

  private static async poll(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Skipping IMAP poll because previous poll is still running');
      return;
    }

    this.isRunning = true;

    let client: ImapFlow | null = null;

    try {
      this.validateAuthenticationConfig();
      client = this.createClient();

      await client.connect();

      const lock = await client.getMailboxLock('INBOX');

      try {
        // The search results must be UIDs because fetchOne and
        // messageFlagsAdd below use uid: true.
        const unseenMessages = (await client.search({ seen: false }, { uid: true })) || [];

        logger.info('IMAP poll completed search', {
          messageCount: unseenMessages.length,
        });

        for (const uid of unseenMessages) {
          try {
            const outcome = await this.processMessage(client, uid);

            if (outcome === 'REVIEW') {
              // Flag for manual investigation.
              await client.messageFlagsAdd(uid, ['\\Flagged'], {
                uid: true,
              });
            }

            // Only mark seen after successful handling and logging.
            await client.messageFlagsAdd(uid, ['\\Seen'], {
              uid: true,
            });
          } catch (error) {
            // Unexpected failures remain unseen for retry.
            logger.error('Failed to process inbound email; will retry', {
              uid,
              error,
            });
          }
        }
      } finally {
        lock.release();
      }
    } catch (error) {
      logger.error('IMAP polling failed', { error });
    } finally {
      if (client) {
        try {
          await client.logout();
        } catch {
          // Client may already be disconnected.
        }
      }

      this.isRunning = false;
    }
  }

  /**
   * A verified Authentication-Results value must:
   *
   * 1. Come from the explicitly trusted authentication service.
   * 2. Contain DMARC=pass.
   * 3. Identify the same From domain as the message sender.
   *
   * IMPORTANT: This verifies domain authentication, not the
   * individual budget officer's identity.
   */
  private static verifySenderAuthentication(
    headerLines: ReadonlyArray<{ key: string; line: string }>,
    senderEmail: string
  ): boolean {
    const trustedId = process.env.IMAP_TRUSTED_AUTHSERV_ID!.trim().toLowerCase();

    const senderDomain = senderEmail.split('@')[1]?.toLowerCase();

    if (!senderDomain) {
      return false;
    }

    const authenticationHeaders = headerLines
      .filter((header) => header.key.toLowerCase() === 'authentication-results')
      .map((header) =>
        header.line
          .replace(/^authentication-results\s*:/i, '')
          .replace(/\r?\n[ \t]+/g, ' ')
          .trim()
      );

    // Multiple purported trusted results are ambiguous.
    // The administrator must verify how their mail provider
    // handles these headers before accepting them.
    const trustedResults = authenticationHeaders.filter((value) => {
      const identifier = value
        .split(';', 1)[0]
        ?.trim()
        .replace(/\s+\d+$/, '')
        .toLowerCase();

      return identifier === trustedId;
    });

    if (trustedResults.length !== 1) {
      return false;
    }

    const result = trustedResults[0];

    const dmarcResults = [...result.matchAll(/(?:^|;)\s*dmarc\s*=\s*([a-z]+)/gi)];

    if (dmarcResults.length !== 1 || dmarcResults[0][1].toLowerCase() !== 'pass') {
      return false;
    }

    // Read the authenticated header.from domain associated
    // with the DMARC result, not an unrelated free-text value.
    const dmarcSection = result.split(';').find((section) => /^\s*dmarc\s*=/i.test(section));

    if (!dmarcSection) {
      return false;
    }

    const authenticatedDomain = dmarcSection
      .match(/\bheader\.from\s*=\s*"?([a-z0-9.-]+)"?/i)?.[1]
      ?.toLowerCase();

    return authenticatedDomain === senderDomain;
  }

  private static async processMessage(client: ImapFlow, uid: number): Promise<MessageOutcome> {
    const message = await client.fetchOne(
      uid,
      {
        source: true,
        envelope: true,
      },
      { uid: true }
    );

    if (!message || !message.source) {
      throw new Error(`Unable to fetch source for IMAP UID ${uid}`);
    }

    const parsedMail = await simpleParser(message.source);
    const incomingMessageId = parsedMail.messageId;

    const senderEmail = parsedMail.from?.value?.[0]?.address;

    if (!senderEmail || parsedMail.from?.value?.length !== 1) {
      await this.logInbound({
        senderEmail: senderEmail ?? '',
        subject: parsedMail.subject ?? '',
        status: 'ERROR',
        type: 'INBOUND_OTHER',
      });

      logger.warn('Inbound email has an invalid sender identity', {
        uid,
      });

      return 'REVIEW';
    }

    const parsed = EmailParserService.parse({
      senderEmail,
      subject: parsedMail.subject,
      body: parsedMail.text,
    });

    if (!parsed.orderNumber) {
      await this.logInbound({
        senderEmail: parsed.senderEmail,
        subject: parsed.subject,
        status: 'PENDING',
        type: 'INBOUND_OTHER',
      });

      logger.warn('Inbound email does not contain an order number', {
        uid,
      });

      return 'REVIEW';
    }

    const order = await prisma.order.findFirst({
      where: {
        orderNumber: parsed.orderNumber,
        isDeleted: false,
      },
    });

    if (!order) {
      await this.logInbound({
        senderEmail: parsed.senderEmail,
        subject: parsed.subject,
        status: 'PENDING',
        type: 'INBOUND_OTHER',
      });

      logger.warn('Inbound email references unknown order', {
        uid,
        orderNumber: parsed.orderNumber,
      });

      return 'REVIEW';
    }

    const senderMatchesBudgetOfficer =
      EmailParserService.normalizeEmail(order.budgetOfficerEmail) === parsed.senderEmail;

    if (!senderMatchesBudgetOfficer) {
      await this.logInbound({
        orderId: order.id,
        senderEmail: parsed.senderEmail,
        subject: parsed.subject,
        status: 'ERROR',
      });

      logger.warn('Inbound sender does not match budget officer', {
        uid,
        orderId: order.id,
        senderEmail: parsed.senderEmail,
      });

      return 'REVIEW';
    }

    // This must run before any approval or rejection transition.
    const senderAuthenticated = this.verifySenderAuthentication(
      parsedMail.headerLines,
      parsed.senderEmail
    );

    if (!senderAuthenticated) {
      await this.logInbound({
        orderId: order.id,
        senderEmail: parsed.senderEmail,
        subject: parsed.subject,
        status: 'ERROR',
      });

      logger.warn('Inbound budget response failed authentication', {
        uid,
        orderId: order.id,
        orderNumber: order.orderNumber,
      });

      return 'REVIEW';
    }

    // Already handled orders must not be changed again.
    // ApprovalService still enforces this atomically.
    if (order.status !== OrderStatus.PENDING_BUDGET) {
      await this.logInbound({
        orderId: order.id,
        senderEmail: parsed.senderEmail,
        subject: parsed.subject,
        status: 'PENDING',
      });

      logger.info('Ignoring response for order no longer awaiting budget', {
        uid,
        orderId: order.id,
        currentStatus: order.status,
      });

      return 'PROCESSED';
    }

    if (parsed.decision === 'UNKNOWN') {
      await this.logInbound({
        orderId: order.id,
        senderEmail: parsed.senderEmail,
        subject: parsed.subject,
        status: 'PENDING',
      });

      logger.warn('Inbound budget response is ambiguous', {
        uid,
        orderId: order.id,
      });

      return 'REVIEW';
    }

    const nextStatus =
      parsed.decision === 'APPROVED'
        ? OrderStatus.PENDING_MANAGER_APPROVAL
        : OrderStatus.REJECTED_BUDGET;

    // A database or transition failure must not silently consume
    // the message. Leave it unseen and retry.
    //
    // If the transition succeeded but the worker crashes later,
    // the next attempt observes that the order is no longer
    // PENDING_BUDGET and does not apply the decision again.
    await ApprovalService.transitionOrderStatus({
      orderId: order.id,
      toStatus: nextStatus,
      changedByUserId: null,
      changedBySource: ChangeSource.EMAIL_BUDGET_OFFICER,
      note:
        parsed.decision === 'APPROVED'
          ? 'האישור התקציבי התקבל במייל.'
          : 'ההזמנה נדחתה על ידי קצין התקציב במייל.',
    });

    try {
      await NotificationService.notifyBudgetOfficer({
        orderId: order.id,
        orderNumber: order.orderNumber,
        budgetOfficerEmail: order.budgetOfficerEmail,
        decision: parsed.decision,
        inReplyTo: incomingMessageId,
        references: incomingMessageId ? [incomingMessageId] : undefined,
        originalSubject: parsed.subject,
      });
    } catch (error) {
      // The decision has already been committed.
      // Notification recovery belongs to the notification worker,
      // not to replaying this inbound decision.
      logger.error('Failed to queue budget decision confirmation', {
        orderId: order.id,
        error,
      });
    }

    logger.info('Inbound budget response processed successfully', {
      uid,
      orderId: order.id,
      orderNumber: order.orderNumber,
      decision: parsed.decision,
      newStatus: nextStatus,
    });

    return 'PROCESSED';
  }

  private static async logInbound(params: {
    orderId?: string;
    senderEmail: string;
    subject: string;
    status: 'PENDING' | 'ERROR';
    type?: 'INBOUND_REPLY' | 'INBOUND_OTHER';
  }): Promise<void> {
    await prisma.emailLog.create({
      data: {
        orderId: params.orderId ?? null,
        direction: 'INBOUND',
        type: params.type ?? 'INBOUND_REPLY',
        toAddress: process.env.IMAP_USER ?? '',
        fromAddress: params.senderEmail,
        subject: params.subject,
        processedStatus: params.status,
      },
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
