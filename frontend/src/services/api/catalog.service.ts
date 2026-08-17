import type { Product } from 'shared-types';

interface CatalogResponse {
  success: boolean;
  data: Product[];
  message?: string;
}

export const getProducts = async (): Promise<Product[]> => {
  const response = await fetch('/api/products');

  if (!response.ok) {
    throw new Error('Failed to load catalog');
  }

  const result: CatalogResponse = await response.json();

  if (!result.success) {
    throw new Error(result.message ?? 'Failed to load catalog');
  }

  return result.data;
};
