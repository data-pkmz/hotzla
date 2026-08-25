import { apiFetch } from '../api.js';

export const getMyOrders = async () => {
  const response = await apiFetch('/api/my-orders');

  if (!response.ok) {
    throw new Error('Failed to load orders');
  }

  return response.json();
};
