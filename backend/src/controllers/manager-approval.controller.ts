import { Request, Response } from 'express';
import { ChangeSource } from '@prisma/client';
import { OrderStatus } from 'shared-types';
import { ApprovalService } from '../services/approval.service';

/**
 * Handles manager decisions for orders waiting for manager approval.
 *
 * Both actions delegate the actual status transition, validation,
 * database update, and audit logging to ApprovalService.
 */
export class ManagerApprovalController {
  /**
   * Approves an order for production.
   *
   * Expects:
   * - req.params.id: UUID of the order being approved.
   * - req.dbUser: The authenticated manager performing the approval.
   *   RBAC middleware is expected to verify the user's role before
   *   this controller is reached.
   *
   * Does:
   * - Requests a status transition to APPROVED_FOR_PRODUCTION.
   * - Records the authenticated manager as the user who made the change.
   * - Records MANAGER_UI as the source of the status change.
   * - ApprovalService validates whether the transition is allowed,
   *   updates the order, and records the status change.
   *
   * Sends:
   * - 200 with the updated order when the transition succeeds.
   * - 400 with an error message when the transition fails.
   */
  static async approve(req: Request, res: Response): Promise<void> {
    try {
      const order = await ApprovalService.transitionOrderStatus({
        orderId: req.params.id,
        toStatus: OrderStatus.APPROVED_FOR_PRODUCTION,
        changedByUserId: req.dbUser!.id,
        changedBySource: ChangeSource.MANAGER_UI,
        note: 'Order approved by manager',
      });

      res.status(200).json(order);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to approve order',
      });
    }
  }

  /**
   * Rejects an order during manager approval.
   *
   * Expects:
   * - req.params.id: UUID of the order being rejected.
   * - req.dbUser: The authenticated manager performing the rejection.
   *   RBAC middleware is expected to verify the user's role before
   *   this controller is reached.
   *
   * Does:
   * - Requests a status transition to REJECTED_MANAGER.
   * - Records the authenticated manager as the user who made the change.
   * - Records MANAGER_UI as the source of the status change.
   * - ApprovalService validates whether the transition is allowed,
   *   updates the order, and records the status change.
   *
   * Sends:
   * - 200 with the updated order when the transition succeeds.
   * - 400 with an error message when the transition fails.
   */
  static async reject(req: Request, res: Response): Promise<void> {
    try {
      const order = await ApprovalService.transitionOrderStatus({
        orderId: req.params.id,
        toStatus: OrderStatus.REJECTED_MANAGER,
        changedByUserId: req.dbUser!.id,
        changedBySource: ChangeSource.MANAGER_UI,
        note: 'Order rejected by manager',
      });

      res.status(200).json(order);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to reject order',
      });
    }
  }
}
