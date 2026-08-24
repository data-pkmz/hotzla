import type { Request, Response } from 'express';
import type { CalculatePriceParams } from 'shared-types';

import { PricingEngineService } from '../services/pricing-engine.service';

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
    console.error('Failed to calculate price:', error);

    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to calculate price',
    });
  }
};
