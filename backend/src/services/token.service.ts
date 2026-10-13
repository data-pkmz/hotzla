import { randomUUID } from 'crypto';
import { prisma } from '../config/db';
import { ChangeSource } from '@prisma/client';
import { OrderStatus } from 'shared-types';
import { ApprovalService } from './approval.service';
import logger from '../utils/logger';
import { hashToken } from '../utils/crypto.utils';

export class TokenService {
  /**
   * Creates a public approval token for an order.
   *
   * Expects:
   * - orderId: UUID of the order that the token should authorize.
   *
   * Does:
   * - Generates a cryptographically random UUID to use as the approval token.
   * - Sets the token expiration time to seven days from creation.
   * - Stores the token in the ApprovalToken table as unused.
   * - Associates the token with the supplied order.
   * - Writes an informational log entry after creation succeeds.
   *
   * Returns:
   * - The generated approval token string.
   *
   * Throws:
   * - Any database error produced while creating the approval-token record.
   */
  public static async generateApprovalToken(orderId: string): Promise<string> {
    const tokenStr = randomUUID();
    const tokenHash = hashToken(tokenStr);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.approvalToken.create({
      data: {
        orderId,
        token: tokenHash,
        isUsed: false,
        expiresAt,
      },
    });

    logger.info('Generated new approval token', {
      orderId,
    });

    return tokenStr;
  }

  /**
   * Returns an existing valid approval token for an order when one is
   * available, otherwise creates a new one.
   *
   * The notification worker may retry a failed email delivery. Reusing
   * the existing token prevents each retry from creating another valid
   * approval link for the same order.
   */
  public static async getOrCreateApprovalToken(orderId: string): Promise<string> {
    // Approval tokens are stored as irreversible SHA-256 hashes in the database.
    // If a retry happens before the token was used, we delete any existing unused token
    // for this order and generate a fresh one, returning the new plaintext token for the email link.
    await prisma.approvalToken.deleteMany({
      where: {
        orderId,
        isUsed: false,
      },
    });

    return this.generateApprovalToken(orderId);
  }

  /**
   * Retrieves the approval-token record and order information required
   * by the public approval page.
   *
   * Expects:
   * - tokenStr: Public approval token supplied through the approval link.
   *
   * Does:
   * - Looks up the ApprovalToken record by its unique token value.
   * - Loads the associated order.
   * - Includes requester information.
   * - Includes order items, their products, and configured attribute values.
   *
   * Returns:
   * - The approval-token record together with its related order information.
   * - null if no token with the supplied value exists.
   *
   * Note:
   * - This method only retrieves the token record. Validation of whether the
   *   token is deleted, used, or expired is performed by the caller.
   *
   * Throws:
   * - Any database error produced while retrieving the token.
   */
  public static async getApprovalInfo(tokenStr: string) {
    const tokenHash = hashToken(tokenStr);
    return prisma.approvalToken.findUnique({
      where: { token: tokenHash },
      include: {
        order: {
          include: {
            requester: {
              select: {
                fullName: true,
                militaryEmail: true,
                unit: true,
                phone: true,
              },
            },
            itemEntries: {
              include: {
                product: true,
                itemAttributeEntries: {
                  include: {
                    attributeDefinition: true,
                    selectedOption: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Validates a public approval token, consumes it, and applies the
   * budget officer's approval or rejection decision to the order.
   *
   * Expects:
   * - tokenStr: Approval token received from the public approval page.
   * - action: Budget decision. Must be either "APPROVE" or "REJECT".
   * - rejectReason: Optional explanation supplied when rejecting the order.
   *
   * Does:
   * - Retrieves the approval-token record.
   * - Rejects tokens that do not exist or have been soft-deleted.
   * - Rejects tokens that have already been used.
   * - Rejects tokens whose expiration time has passed.
   * - Atomically changes the token from unused to used so concurrent
   *   requests cannot successfully consume the same token twice.
   * - Converts APPROVE into PENDING_MANAGER_APPROVAL.
   * - Converts REJECT into REJECTED_BUDGET.
   * - Calls ApprovalService to perform the order status transition and
   *   record the associated status history.
   * - Records EMAIL_BUDGET_OFFICER as the source because the decision
   *   comes from an unauthenticated budget-approval flow rather than
   *   an authenticated application user.
   *
   * Returns:
   * - The updated order returned by ApprovalService.
   *
   * Throws:
   * - "Invalid token" if the token does not exist or has been deleted.
   * - An error if the token has already been used.
   * - An error if the token has expired.
   * - Any error produced by ApprovalService while changing the order status.
   *
   * Important:
   * - Token consumption and the order status transition are currently
   *   separate database operations. If the status transition fails after
   *   the token is consumed, the token remains marked as used.
   */
  public static async validateAndUseToken(
    tokenStr: string,
    action: 'APPROVE' | 'REJECT',
    rejectReason?: string
  ) {
    // 1. Fetch and validate the token
    const tokenHash = hashToken(tokenStr);
    const tokenRecord = await prisma.approvalToken.findUnique({
      where: { token: tokenHash },
    });

    if (!tokenRecord || tokenRecord.isDeleted) {
      throw new Error('Invalid token');
    }

    if (tokenRecord.isUsed) {
      throw new Error('This approval link has already been used.');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new Error('This approval link has expired.');
    }

    // Claim the token only if it is still unused. This prevents two
    // simultaneous requests from successfully consuming the same token.
    try {
      await prisma.approvalToken.update({
        where: {
          id: tokenRecord.id,
          isUsed: false,
        },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });
    } catch (error) {
      throw new Error('This approval link has already been used.', { cause: error });
    }

    const toStatus =
      action === 'APPROVE' ? OrderStatus.PENDING_MANAGER_APPROVAL : OrderStatus.REJECTED_BUDGET;

    const note =
      action === 'APPROVE'
        ? 'אושר באמצעות אישור מהיר (טוקן)'
        : `נדחה באמצעות אישור מהיר: ${rejectReason || 'לא צוינה סיבה'}`;

    try {
      const order = await ApprovalService.transitionOrderStatus({
        orderId: tokenRecord.orderId,
        toStatus,
        changedBySource: ChangeSource.EMAIL_BUDGET_OFFICER,
        changedByUserId: null,
        note,
      });

      logger.info('Order decision processed through public approval token', {
        orderId: order.id,
        action,
      });

      return order;
    } catch (error) {
      logger.error('Failed to transition order status using public token', {
        error,
        orderId: tokenRecord.orderId,
        action,
      });

      throw error;
    }
  }
}
