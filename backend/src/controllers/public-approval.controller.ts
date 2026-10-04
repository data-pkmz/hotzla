import { Request, Response } from 'express';
import { TokenService } from '../services/token.service';

import logger from '../utils/logger';

export class PublicApprovalController {
  /**
   * GET /api/public/approval-info/:token
   * Fetches the order details associated with an approval token.
   * Does not require authentication, but requires a valid unused token.
   */
  public static async getApprovalInfo(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const tokenRecord = await TokenService.getApprovalInfo(token);

      if (!tokenRecord || tokenRecord.isDeleted) {
        return res.status(404).json({ error: 'Invalid or missing token' });
      }

      if (tokenRecord.isUsed) {
        return res.status(400).json({ error: 'This approval link has already been used.' });
      }

      if (tokenRecord.expiresAt < new Date()) {
        return res.status(400).json({ error: 'This approval link has expired.' });
      }

      return res.status(200).json({
        order: tokenRecord.order,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get approval info', { error: errorMessage });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/public/approve-budget
   * Processes the approval or rejection decision.
   */
  public static async processApproval(req: Request, res: Response) {
    try {
      const { token, action, rejectReason } = req.body;

      if (!token || !action) {
        return res.status(400).json({ error: 'Token and action are required' });
      }

      if (action !== 'APPROVE' && action !== 'REJECT') {
        return res.status(400).json({ error: 'Invalid action. Must be APPROVE or REJECT' });
      }

      const updatedOrder = await TokenService.validateAndUseToken(token, action, rejectReason);

      return res.status(200).json({
        message: `Order successfully ${action.toLowerCase()}d.`,
        order: updatedOrder,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Public approval failed: ${errorMessage}`);

      // If it's our known error from TokenService, send 400 Bad Request
      if (
        errorMessage.includes('has already been used') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('Invalid token')
      ) {
        return res.status(400).json({ error: errorMessage });
      }

      return res.status(500).json({ error: 'An error occurred while processing the approval.' });
    }
  }
}
