import { Request, Response } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import logger from '../utils/logger';

export class AuditController {
  /**
   * Retrieves the status change history for a specific order.
   *
   * Expects:
   * - req.params.id: UUID of the order whose status history should be retrieved.
   *
   * Does:
   * - Calls AuditLogService.getStatusHistory with the order ID.
   * - Retrieves the recorded status transitions for the order.
   * - The returned history can be used to display the order's status timeline,
   *   including previous status changes recorded by the application.
   *
   * Sends:
   * - 200 with the order's status history on success.
   * - 500 with an error message if the history cannot be retrieved.
   *
   * Route:
   * - GET /api/orders/:id/history
   */
  public static async getOrderHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const history = await AuditLogService.getStatusHistory(id);

      return res.status(200).json(history);
    } catch (error: unknown) {
      logger.error('AuditController.getOrderHistory error', {
        error,
        orderId: req.params.id,
      });

      return res.status(500).json({
        error: 'Failed to retrieve order history',
      });
    }
  }
}
