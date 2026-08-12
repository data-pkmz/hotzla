// Pricing Engine interfaces

/**
 * A selected attribute passed into the pricing engine.
 */
export interface SelectedAttributeInput {
  attributeDefinitionId: string;
  selectedOptionIds?: string[];
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
  attributeName: string;
  selectedValue: string;
  contribution: number;
}

/**
 * Final result returned by the pricing engine.
 */
export interface PriceResult {
  baseTotal: number;
  totalAdditionalPrice: number;
  totalPrice: number;
  breakdown: PriceBreakdownLine[];
}
