import { useEffect, useState } from 'react';

import type { ProductDetails } from 'shared-types';

interface ProductDetailsResponse {
  success: boolean;
  data?: ProductDetails;
  message?: string;
}

export default function useProductDetails(productId?: string) {
  const [product, setProduct] = useState<ProductDetails | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      return;
    }

    const controller = new AbortController();

    const loadProduct = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/products/${productId}`, {
          signal: controller.signal,
        });

        const result = (await response.json()) as ProductDetailsResponse;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message ?? 'Failed to load product');
        }

        setProduct(result.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setError(error instanceof Error ? error.message : 'Failed to load product');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadProduct();

    return () => {
      controller.abort();
    };
  }, [productId]);

  return {
    product,
    isLoading,
    error,
  };
}
