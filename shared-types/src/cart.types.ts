import type { SelectedAttributeInput } from './pricing.types';

/**
 * Interface representing the JSON structure saved in the database
 * for a CartItem's 'selectedAttributes' column.
 */
export interface CartItemAttributesJson {
  quantity: number;
  attributes: SelectedAttributeInput[];
}

export interface AddToCartInput {
  productId: string;
  quantity: number;
  selectedAttributes: SelectedAttributeInput[];
  uploadedFilePath?: string;
}

export interface UpdateCartItemInput {
  quantity: number;
  selectedAttributes: SelectedAttributeInput[];
}
