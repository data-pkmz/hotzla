import type { Product } from 'shared-types';
import { apiFetch } from '../api';

interface CatalogResponse {
  success: boolean;
  data: Product[];
  message?: string;
}

/**
 * Fetches active products available in the public catalog.
 *
 * Used by requesters and other non-manager users.
 */
export const getProducts = async (): Promise<Product[]> => {
  const response = await apiFetch('/api/products');

  if (!response.ok) {
    throw new Error('Failed to load catalog');
  }

  const result: CatalogResponse = await response.json();

  if (!result.success) {
    throw new Error(result.message ?? 'Failed to load catalog');
  }

  return result.data;
};

/**
 * Fetches all products, including inactive products.
 *
 * Accessible only to users with the MANAGER role.
 */
export const getAdminProducts = async (): Promise<Product[]> => {
  const response = await apiFetch('/api/admin/products');

  if (!response.ok) {
    throw new Error('Failed to load manager catalog');
  }

  const result: CatalogResponse = await response.json();

  if (!result.success) {
    throw new Error(result.message ?? 'Failed to load manager catalog');
  }

  return result.data;
};

/**
 * Complete product details returned by the manager API.
 *
 * Includes attribute definitions and options needed
 * for editing existing product configurations.
 */
export interface AdminProductDetails extends Product {
  attributes: Array<{
    id: string;
    productId: string;
    attributeName: string;
    attributeType: string;
    displayStyle: string;
    isRequired: boolean;
    displayOrder: number;
    pricingRule: string;
    unitPrice: number | null;
    minValue: number | null;
    maxValue: number | null;
    options: Array<{
      id: string;
      attributeDefinitionId: string;
      optionLabel: string;
      optionValue: string;
      priceModifier: number;
      priceModifierType: string;
      isPerUnit: boolean;
      displayOrder: number;
    }>;
  }>;
}

/**
 * Fields supported when updating a product's basic details.
 */
export interface UpdateProductPayload {
  name?: string;
  description?: string;
  category?: string;
  basePrice?: number;
  isActive?: boolean;
  imageUrl?: string;
  minQuantity?: number;
  maxQuantity?: number | null;
}

/**
 * Fetches a single product for editing, including inactive products
 * and their current attribute configurations.
 *
 * MANAGER only.
 */
export const getAdminProductById = async (productId: string): Promise<AdminProductDetails> => {
  const response = await apiFetch(`/api/admin/products/${encodeURIComponent(productId)}`);

  if (!response.ok) {
    throw new Error(response.status === 404 ? 'המוצר לא נמצא' : 'Failed to load product details');
  }

  const result: {
    success: boolean;
    data: AdminProductDetails;
    message?: string;
  } = await response.json();

  if (!result.success) {
    throw new Error(result.message ?? 'Failed to load product details');
  }

  return result.data;
};

/**
 * Updates the basic properties of an existing product.
 *
 * MANAGER only.
 *
 * Dynamic attributes are deliberately not included until
 * we implement ID-preserving attribute updates.
 */
export const updateProduct = async (
  productId: string,
  data: UpdateProductPayload
): Promise<Product> => {
  const response = await apiFetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: {
    success: boolean;
    data?: Product;
    message?: string;
  } = await response.json();

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message ?? 'Failed to update product');
  }

  return result.data;
};
