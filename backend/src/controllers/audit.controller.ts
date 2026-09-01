import { Request, Response } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import logger from '../utils/logger';

export class AuditController {
  /**
   * GET /api/orders/:id/history
   * Retrieves the status history timeline for a specific order.
   */
  public static async getOrderHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const history = await AuditLogService.getStatusHistory(id);

      return res.status(200).json(history);
    } catch (error: unknown) {
      logger.error('AuditController.getOrderHistory error', { error, orderId: req.params.id });
      return res.status(500).json({ error: 'Failed to retrieve order history' });
    }
  }
}
