import { Request, Response } from 'express';
import { TokenService } from '../services/token.service';
import logger from '../utils/logger';

export class PublicApprovalController {
  /**
   * Retrieves the order information associated with a public approval token.
   *
   * This endpoint does not require normal application authentication.
   * Possession of a valid approval token is what grants temporary access
   * to the associated order approval information.
   *
   * Expects:
   * - req.params.token: Approval token generated for the order.
   *
   * Does:
   * - Verifies that a token was provided in the route parameters.
   * - Calls TokenService.getApprovalInfo to retrieve the token record and
   *   its associated order.
   * - Rejects tokens that do not exist or have been soft-deleted.
   * - Rejects tokens that have already been used.
   * - Rejects tokens whose expiration time has passed.
   *
   * Sends:
   * - 200 with the order associated with a valid, unused, unexpired token.
   * - 400 if the token has already been used or has expired.
   * - 400 if the token parameter is missing.
   * - 404 if the token does not exist or has been deleted.
   * - 500 if an unexpected error occurs while retrieving the approval data.
   *
   * Route:
   * - GET /api/public/approval-info/:token
   */
  public static async getApprovalInfo(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          error: 'Token is required',
        });
      }

      const tokenRecord = await TokenService.getApprovalInfo(token);

      if (!tokenRecord || tokenRecord.isDeleted) {
        return res.status(404).json({
          error: 'Invalid or missing token',
        });
      }

      if (tokenRecord.isUsed) {
        return res.status(400).json({
          error: 'This approval link has already been used.',
        });
      }

      if (tokenRecord.expiresAt < new Date()) {
        return res.status(400).json({
          error: 'This approval link has expired.',
        });
      }

      return res.status(200).json({
        order: tokenRecord.order,
      });
    } catch (error: unknown) {
      logger.error('Failed to get approval info', { error });

      return res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Processes a budget officer's approval or rejection decision using
   * a public approval token.
   *
   * This endpoint does not require normal application authentication.
   * TokenService is responsible for validating that the supplied token
   * is valid, unused, unexpired, and authorized for the associated order.
   *
   * Expects:
   * - req.body.token: Approval token associated with the order.
   * - req.body.action: Decision to apply. Must be either "APPROVE" or "REJECT".
   * - req.body.rejectReason: Optional rejection reason supplied when the
   *   decision is REJECT.
   *
   * Does:
   * - Verifies that both a token and action were provided.
   * - Verifies that the action is one of the supported approval decisions.
   * - Calls TokenService.validateAndUseToken to validate the token and
   *   process the requested decision.
   * - TokenService is responsible for marking the token as used and applying
   *   the corresponding order status transition.
   *
   * Sends:
   * - 200 with a success message and the updated order when the decision
   *   is processed successfully.
   * - 400 when required input is missing or the action is invalid.
   * - 400 when the token is invalid, expired, or has already been used.
   * - 500 when an unexpected error occurs while processing the decision.
   *
   * Route:
   * - POST /api/public/approve-budget
   */
  public static async processApproval(req: Request, res: Response) {
    try {
      const { token, action, rejectReason } = req.body;

      if (!token || !action) {
        return res.status(400).json({
          error: 'Token and action are required',
        });
      }

      if (action !== 'APPROVE' && action !== 'REJECT') {
        return res.status(400).json({
          error: 'Invalid action. Must be APPROVE or REJECT',
        });
      }

      const updatedOrder = await TokenService.validateAndUseToken(token, action, rejectReason);

      return res.status(200).json({
        message: `Order successfully ${action.toLowerCase()}d.`,
        order: updatedOrder,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Public approval failed', {
        error,
      });

      // Known token-validation failures are client errors rather than
      // unexpected server failures.
      if (
        errorMessage.includes('has already been used') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('Invalid token')
      ) {
        return res.status(400).json({
          error: errorMessage,
        });
      }

      return res.status(500).json({
        error: 'An error occurred while processing the approval.',
      });
    }
  }
}
