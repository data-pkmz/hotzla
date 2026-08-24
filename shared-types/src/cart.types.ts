import type { SelectedAttributeInput } from './pricing.types';

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
