import type { Product } from './product.types';
import type { SelectedAttributeInput } from './pricing.types';
import { Product } from './product.types';

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

// Cart structures
export type CartStatus = 'ACTIVE' | 'CONVERTED' | 'ABANDONED';

export interface Cart {
  id: string;
  userId: string;
  status: CartStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  items?: CartItem[];
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  uploadedFilePath?: string;
  computedPrice: number;
  selectedAttributes: Record<string, string | number | boolean>;
  product?: Product;
}
