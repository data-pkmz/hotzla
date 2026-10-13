import type { Request, Response } from 'express';
import type { CalculatePriceParams } from 'shared-types';

import { PricingEngineService } from '../services/pricing-engine.service';
import logger from '../utils/logger';

/**
 * Calculates the price of a product based on quantity and selected attributes.
 *
 * Expects:
 * - req.body.productId: ID of the product whose price should be calculated.
 * - req.body.quantity: Positive integer representing the requested quantity.
 * - req.body.selectedAttributes: Optional array containing the user's selected
 *   product attribute values. Defaults to an empty array when not provided.
 *
 * Does:
 * - Validates that a product ID was provided.
 * - Validates that quantity is a positive integer.
 * - Validates that selectedAttributes is an array.
 * - Passes the validated pricing input to PricingEngineService.
 * - PricingEngineService calculates the authoritative price and price breakdown
 *   according to the product's pricing rules and selected attributes.
 *
 * Sends:
 * - 200 with success=true and the calculated pricing result on success.
 * - 400 with success=false when required input is missing or invalid.
 * - 400 with success=false and an error message when price calculation fails.
 */
export const calculatePrice = async (
  req: Request<unknown, unknown, CalculatePriceParams>,
  res: Response
): Promise<void> => {
  try {
    const { productId, quantity, selectedAttributes = [] } = req.body;

    if (!productId) {
      res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer',
      });
      return;
    }

    if (!Array.isArray(selectedAttributes)) {
      res.status(400).json({
        success: false,
        message: 'Selected attributes must be an array',
      });
      return;
    }

    const result = await PricingEngineService.calculatePrice({
      productId,
      quantity,
      selectedAttributes,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to calculate price', { error });

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to calculate price',
    });
  }
};
