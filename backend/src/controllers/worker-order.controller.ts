import { Request, Response } from 'express';
import { ChangeSource, OrderStatus, Role } from '@prisma/client';

import { ApprovalService } from '../services/approval.service';
import { EmailService } from '../services/email.service';
import { OrderService } from '../services/order.service';
import logger from '../utils/logger';

export class WorkerOrderController {
  /**
   * Determines the audit source for a production status change.
   *
   * Expects:
   * - role: Role of the authenticated user performing the status change.
   *
   * Does:
   * - Returns MANAGER_UI when the action is performed by a manager.
   * - Returns WORKER_UI for worker actions.
   *
   * Returns:
   * - The ChangeSource value that should be recorded in the order's
   *   status-history entry.
   */
  private static getChangeSource(role: Role): ChangeSource {
    return role === Role.MANAGER ? ChangeSource.MANAGER_UI : ChangeSource.WORKER_UI;
  }

  /**
   * Moves an approved order into production.
   *
   * Expects:
   * - req.params.id: UUID of the order to start producing.
   * - req.dbUser: Authenticated MANAGER or WORKER populated by the
   *   authentication/RBAC middleware.
   * - req.body.note: Optional note describing the status change.
   *
   * Does:
   * - Verifies that authenticated database-user context is available.
   * - Calls ApprovalService to transition the order to IN_PRODUCTION.
   * - Records the authenticated user as the person who performed the change.
   * - Records MANAGER_UI or WORKER_UI as the change source according
   *   to the user's role.
   * - ApprovalService validates the transition, updates the order, and
   *   records the corresponding status-history entry.
   *
   * Sends:
   * - 200 after the order successfully transitions to IN_PRODUCTION.
   * - 500 with an error message if the user context is missing or the
   *   transition fails.
   */
  static async startPrinting(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.id;
      const user = req.dbUser;

      if (!user) {
        throw new Error('User context missing');
      }

      await ApprovalService.transitionOrderStatus({
        orderId,
        toStatus: OrderStatus.IN_PRODUCTION,
        changedByUserId: user.id,
        changedBySource: WorkerOrderController.getChangeSource(user.role),
        note: req.body.note || null,
      });

      res.status(200).json({
        message: 'Order status updated to IN_PRODUCTION',
      });
    } catch (error) {
      logger.error('Error starting printing', {
        error,
        orderId: req.params.id,
      });

      const message = error instanceof Error ? error.message : 'Internal server error';

      res.status(500).json({
        error: message,
      });
    }
  }

  /**
   * Marks an order as ready for pickup and attempts to notify the requester.
   *
   * Expects:
   * - req.params.id: UUID of the order that is ready for pickup.
   * - req.dbUser: Authenticated MANAGER or WORKER populated by the
   *   authentication/RBAC middleware.
   * - req.body.note: Optional note describing the status transition.
   * - req.body.pickupInstructions: Optional pickup instructions to include
   *   in the requester notification.
   *
   * Does:
   * - Verifies that authenticated database-user context is available.
   * - Calls ApprovalService to transition the order to READY_FOR_PICKUP.
   * - Records the authenticated user and UI source in the status history.
   * - Retrieves the updated order and requester details through OrderService.
   * - If the requester has an email address, sends a ready-for-pickup email.
   * - Uses default Hebrew pickup instructions when custom instructions
   *   are not supplied.
   *
   * Sends:
   * - 200 when the order is updated and the notification email is sent.
   * - 200 when the order is updated but no requester email address is available.
   * - 500 if the status transition, order retrieval, or email sending fails.
   */
  static async readyForPickup(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.id;
      const user = req.dbUser;

      if (!user) {
        throw new Error('User context missing');
      }

      await ApprovalService.transitionOrderStatus({
        orderId,
        toStatus: OrderStatus.READY_FOR_PICKUP,
        changedByUserId: user.id,
        changedBySource: WorkerOrderController.getChangeSource(user.role),
        note: req.body.note || null,
      });

      const order = await OrderService.getOrderById(orderId, {
        id: user.id,
        role: user.role,
      });

      if (order.requester?.militaryEmail) {
        await EmailService.sendReadyForPickup({
          orderId: order.id,
          orderNumber: order.orderNumber,
          requesterEmail: order.requester.militaryEmail,
          pickupInstructions:
            req.body.pickupInstructions || 'ההזמנה שלך מוכנה לאיסוף במרכז ההדפסה.',
          trackingUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order.id}`,
        });

        res.status(200).json({
          message: 'Order status updated to READY_FOR_PICKUP and email sent',
        });

        return;
      }

      logger.warn('Could not send ready-for-pickup email: missing requester email', {
        orderId,
      });

      res.status(200).json({
        message:
          'Order status updated to READY_FOR_PICKUP ' + '(no email sent due to missing address)',
      });
    } catch (error) {
      logger.error('Error marking order as ready for pickup', {
        error,
        orderId: req.params.id,
      });

      const message = error instanceof Error ? error.message : 'Internal server error';

      res.status(500).json({
        error: message,
      });
    }
  }

  /**
   * Marks a ready-for-pickup order as completed.
   *
   * Expects:
   * - req.params.id: UUID of the order to complete.
   * - req.dbUser: Authenticated MANAGER or WORKER populated by the
   *   authentication/RBAC middleware.
   * - req.body.note: Optional note describing the status change.
   *
   * Does:
   * - Verifies that authenticated database-user context is available.
   * - Calls ApprovalService to transition the order to COMPLETED.
   * - Records the authenticated user as the person who performed the change.
   * - Records MANAGER_UI or WORKER_UI according to the user's role.
   * - ApprovalService validates the transition, updates the order, and
   *   records the corresponding status-history entry.
   *
   * Sends:
   * - 200 after the order successfully transitions to COMPLETED.
   * - 500 with an error message if the user context is missing or the
   *   transition fails.
   */
  static async completeOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.id;
      const user = req.dbUser;

      if (!user) {
        throw new Error('User context missing');
      }

      await ApprovalService.transitionOrderStatus({
        orderId,
        toStatus: OrderStatus.COMPLETED,
        changedByUserId: user.id,
        changedBySource: WorkerOrderController.getChangeSource(user.role),
        note: req.body.note || null,
      });

      res.status(200).json({
        message: 'Order status updated to COMPLETED',
      });
    } catch (error) {
      logger.error('Error completing order', {
        error,
        orderId: req.params.id,
      });

      const message = error instanceof Error ? error.message : 'Internal server error';

      res.status(500).json({
        error: message,
      });
    }
  }
}
