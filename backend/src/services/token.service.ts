import { randomUUID } from 'crypto';
import { prisma } from '../config/db';
import { ChangeSource } from '@prisma/client';
import { OrderStatus } from 'shared-types';
import { ApprovalService } from './approval.service';
import logger from '../utils/logger';
import { hashToken } from '../utils/crypto.utils';

export class TokenService {
  /**
   * Generates a unique, secure approval token for an order.
   * The token expires in 7 days.
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

    logger.info(`Generated new approval token for order ${orderId}`);
    return tokenStr;
  }

  /**
   * Fetches the order details associated with an approval token.
   * Returns the token record with deep nested order relations.
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
   * Validates a token and processes the approval/rejection decision.
   * Ensures the token is only used once.
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

    // 2. Mark the token as used atomically to prevent double-clicks
    try {
      await prisma.approvalToken.update({
        where: {
          id: tokenRecord.id,
          isUsed: false, // Optimistic locking
        },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });
    } catch (error) {
      throw new Error('This approval link has already been used.', { cause: error });
    }

    // 3. Update the order status using our solid ApprovalService
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
        changedByUserId: null, // No specific user ID because it's a public unauthenticated route
        note,
      });

      logger.info(`Order ${order.id} was ${action} via public token.`);
      return order;
    } catch (error) {
      logger.error(`Failed to transition order status using token: ${error}`);
      throw error;
    }
  }
}
