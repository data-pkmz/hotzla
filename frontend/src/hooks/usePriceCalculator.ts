import { useEffect, useState } from 'react';

import type { PriceResult, SelectedAttributeInput } from 'shared-types';

interface UsePriceCalculatorParams {
  productId?: string;
  quantity: number;
  selectedAttributes: SelectedAttributeInput[];
  enabled?: boolean;
}

interface PricingResponse {
  success: boolean;
  data?: PriceResult;
  message?: string;
}

export default function usePriceCalculator({
  productId,
  quantity,
  selectedAttributes,
  enabled = true,
}: UsePriceCalculatorParams) {
  const [priceResult, setPriceResult] = useState<PriceResult | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const canCalculate = Boolean(productId) && enabled && Number.isInteger(quantity) && quantity > 0;

  useEffect(() => {
    if (!canCalculate || !productId) {
      return;
    }

    const controller = new AbortController();

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/pricing/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId,
            quantity,
            selectedAttributes,
          }),
          signal: controller.signal,
        });

        const result = (await response.json()) as PricingResponse;

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message ?? 'Failed to calculate price');
        }

        setPriceResult(result.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setPriceResult(null);

        setError(error instanceof Error ? error.message : 'Failed to calculate price');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [productId, quantity, selectedAttributes, canCalculate]);

  return {
    priceResult: canCalculate ? priceResult : null,
    isLoading: canCalculate ? isLoading : false,
    error: canCalculate ? error : null,
  };
}
