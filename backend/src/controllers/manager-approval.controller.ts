import { Request, Response } from 'express';
import { ChangeSource } from '@prisma/client';
import { OrderStatus } from 'shared-types';
import { ApprovalService } from '../services/approval.service';

export class ManagerApprovalController {
  static async approve(req: Request, res: Response): Promise<void> {
    try {
      const order = await ApprovalService.transitionOrderStatus({
        orderId: req.params.id,
        toStatus: OrderStatus.APPROVED_FOR_PRODUCTION,
        changedByUserId: res.locals.authenticatedUser.id,
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

  static async reject(req: Request, res: Response): Promise<void> {
    try {
      const order = await ApprovalService.transitionOrderStatus({
        orderId: req.params.id,
        toStatus: OrderStatus.REJECTED_MANAGER,
        changedByUserId: res.locals.authenticatedUser.id,
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
