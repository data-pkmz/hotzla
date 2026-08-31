// Pricing Engine interfaces

/**
 * A selected attribute passed into the pricing engine.
 */
export interface SelectedAttributeInput {
  attributeDefinitionId: string;
  selectedOptionIds?: string[];
  selectedOptionId?: string;
  value?: string | number | boolean;
}

/**
 * Input required to calculate a product's price.
 */
export interface CalculatePriceParams {
  productId: string;
  quantity: number;
  selectedAttributes?: SelectedAttributeInput[];
}

/**
 * One attribute's contribution to the calculated price.
 */
export interface PriceBreakdownLine {
  attributeDefinitionId: string;
  attributeName: string;
  selectedValue: string;
  contribution: number;
}

/**
 * Final result returned by the pricing engine.
 */
export interface PriceResult {
  quantity: number;
  baseTotal: number;
  totalAdditionalPrice: number;
  totalPrice: number;
  breakdown: PriceBreakdownLine[];
}
