import { useEffect, useState } from 'react';

import type { PriceResult, SelectedAttributeInput } from 'shared-types';

interface UsePriceCalculatorParams {
  productId?: string;
  quantity: number;
  minQuantity?: number;
  maxQuantity?: number | null;
  selectedAttributes: SelectedAttributeInput[];
  enabled?: boolean;
}

interface PricingResponse {
  success: boolean;
  data?: PriceResult;
  message?: string;
}

interface PricingRequest {
  productId: string;
  quantity: number;
  selectedAttributes: SelectedAttributeInput[];
}

const PRICING_DEBOUNCE_MS = 300;

export default function usePriceCalculator({
  productId,
  quantity,
  minQuantity = 1,
  maxQuantity = null,
  selectedAttributes,
  enabled = true,
}: UsePriceCalculatorParams) {
  const [priceResult, setPriceResult] = useState<PriceResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCalculate =
    Boolean(productId) &&
    enabled &&
    Number.isInteger(quantity) &&
    quantity >= minQuantity &&
    (maxQuantity === null || quantity <= maxQuantity);

  /**
   * Creates a stable representation of the selected attributes.
   *
   * This prevents the debounce timer from restarting merely because
   * React created a new array reference containing the same values.
   */
  const selectedAttributesKey = JSON.stringify(selectedAttributes);

  /**
   * Debounces pricing changes and performs the pricing request.
   *
   * Every time the product, quantity, or selected attributes change,
   * the previous timer/request is cancelled.
   *
   * The request is only sent after the configuration has remained
   * unchanged for PRICING_DEBOUNCE_MS.
   */
  useEffect(() => {
    if (!canCalculate || !productId) {
      return;
    }

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      const calculatePrice = async () => {
        try {
          setIsLoading(true);
          setError(null);

          /**
           * Reconstruct the attributes from the stable serialized value.
           *
           * This allows the effect to depend on selectedAttributesKey
           * rather than the selectedAttributes array reference itself.
           */
          const requestSelectedAttributes = JSON.parse(
            selectedAttributesKey
          ) as SelectedAttributeInput[];

          const request: PricingRequest = {
            productId,
            quantity,
            selectedAttributes: requestSelectedAttributes,
          };

          const response = await fetch('/api/pricing/calculate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
            signal: controller.signal,
          });

          const result = (await response.json()) as PricingResponse;

          if (!response.ok || !result.success || !result.data) {
            throw new Error(result.message ?? 'Failed to calculate price');
          }

          if (!controller.signal.aborted) {
            setPriceResult(result.data);
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }

          if (controller.signal.aborted) {
            return;
          }

          setPriceResult(null);

          setError(error instanceof Error ? error.message : 'Failed to calculate price');
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      };

      void calculatePrice();
    }, PRICING_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [productId, quantity, selectedAttributesKey, canCalculate]);

  return {
    /**
     * Invalid/incomplete configurations should not expose an old price,
     * loading state, or error to the UI.
     *
     * These values are derived here rather than being synchronously reset
     * with setState inside useEffect.
     */
    priceResult: canCalculate ? priceResult : null,
    isLoading: canCalculate ? isLoading : false,
    error: canCalculate ? error : null,
  };
}
