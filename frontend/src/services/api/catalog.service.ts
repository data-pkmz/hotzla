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
