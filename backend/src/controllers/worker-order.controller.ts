import { Request, Response } from 'express';
import { ChangeSource, OrderStatus, Role } from '@prisma/client';
import { ApprovalService } from '../services/approval.service';
import { EmailService } from '../services/email.service';
import { OrderService } from '../services/order.service';
import logger from '../utils/logger';

export class WorkerOrderController {
  private static getChangeSource(role?: Role): ChangeSource {
    return role === Role.MANAGER ? ChangeSource.MANAGER_UI : ChangeSource.WORKER_UI;
  }

  static async startPrinting(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.id;
      const user = req.dbUser;

      await ApprovalService.transitionOrderStatus({
        orderId,
        toStatus: OrderStatus.IN_PRODUCTION,
        changedByUserId: user?.id,
        changedBySource: WorkerOrderController.getChangeSource(user?.role),
        note: req.body.note || null,
      });

      res.status(200).json({ message: 'Order status updated to IN_PRODUCTION' });
    } catch (error) {
      logger.error('Error starting printing', { error, orderId: req.params.id });
      const message = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }

  static async readyForPickup(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.id;
      const user = req.dbUser;

      // Transition the status
      await ApprovalService.transitionOrderStatus({
        orderId,
        toStatus: OrderStatus.READY_FOR_PICKUP,
        changedByUserId: user?.id,
        changedBySource: WorkerOrderController.getChangeSource(user?.role),
        note: req.body.note || null,
      });

      if (!user) {
        throw new Error('User context missing');
      }

      // Fetch the order using the OrderService instead of direct Prisma calls
      const order = await OrderService.getOrderById(orderId, { id: user.id, role: user.role });

      if (order && order.requester?.militaryEmail) {
        // Send the email to the requester
        await EmailService.sendReadyForPickup({
          orderId: order.id,
          orderNumber: order.orderNumber,
          requesterEmail: order.requester.militaryEmail,
          pickupInstructions:
            req.body.pickupInstructions || 'Your order is ready for pickup at the printing center.',
          trackingUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order.id}`,
        });
      } else {
        logger.warn('Could not send ready-for-pickup email: missing order or requester email', {
          orderId,
        });
      }

      res.status(200).json({ message: 'Order status updated to READY_FOR_PICKUP and email sent' });
    } catch (error) {
      logger.error('Error marking order as ready for pickup', { error, orderId: req.params.id });
      const message = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }

  static async completeOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.id;
      const user = req.dbUser;

      await ApprovalService.transitionOrderStatus({
        orderId,
        toStatus: OrderStatus.COMPLETED,
        changedByUserId: user?.id,
        changedBySource: WorkerOrderController.getChangeSource(user?.role),
        note: req.body.note || null,
      });

      res.status(200).json({ message: 'Order status updated to COMPLETED' });
    } catch (error) {
      logger.error('Error completing order', { error, orderId: req.params.id });
      const message = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  }
}
