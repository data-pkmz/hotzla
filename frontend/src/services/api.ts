import { useQuery } from '@tanstack/react-query';

import type { Product, Order } from 'shared-types';
import { useAuthStore } from '../store/useAuthStore';

export const apiFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> => {
  const headers = new Headers(init.headers);

  const isMockAuthEnabled = import.meta.env.VITE_ENABLE_MOCK_AUTH !== 'false';

  if (isMockAuthEnabled) {
    const { currentUser } = useAuthStore.getState();

    headers.set('X-Mock-User', currentUser.adUsername);
  }

  return fetch(input, {
    ...init,
    headers,
  });
};

// Placeholder queries

export const useProducts = () => {
  return useQuery<Product[]>({
    queryKey: ['products'],

    queryFn: async () => {
      const res = await apiFetch('/api/products');

      if (!res.ok) {
        throw new Error('Failed to fetch products');
      }

      return res.json();
    },

    enabled: false,
  });
};

export const useOrders = () => {
  return useQuery<Order[]>({
    queryKey: ['orders'],

    queryFn: async () => {
      const res = await apiFetch('/api/orders');

      if (!res.ok) {
        throw new Error('Failed to fetch orders');
      }

      return res.json();
    },

    enabled: false,
  });
};
