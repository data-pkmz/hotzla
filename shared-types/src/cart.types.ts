import type { Product } from './product.types';
import type { SelectedAttributeInput } from './pricing.types';

export type CartStatus = 'ACTIVE' | 'CONVERTED' | 'ABANDONED';

export interface AddToCartInput {
  productId: string;
  quantity: number;
  selectedAttributes: SelectedAttributeInput[];
  uploadedFilePath?: string;
}

export interface UpdateCartItemInput {
  quantity?: number;
  selectedAttributes?: SelectedAttributeInput[];
}

export interface Cart {
  id: string;
  userId: string;
  status: CartStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  items?: CartItem[];
  cartItemEntries?: CartItem[];
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  uploadedFilePath?: string;
  computedPrice: number;
  selectedAttributes: SelectedAttributeInput[];
  product?: Product;
}
