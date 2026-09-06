import type { Order, OrderDetails, OrderListResponse } from 'shared-types';
import { apiFetch } from '../api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const getMyOrders = async (): Promise<Order[]> => {
  const response = await apiFetch('/api/orders/my-orders');

  if (!response.ok) {
    throw new Error('Failed to load orders');
  }

  const result: ApiResponse<Order[]> = await response.json();

  return result.data;
};

export const getOrders = async (): Promise<OrderListResponse> => {
  const response = await apiFetch('/api/orders');

  if (!response.ok) {
    throw new Error('Failed to load orders');
  }

  const result: ApiResponse<OrderListResponse> = await response.json();

  return result.data;
};

export const getOrderById = async (orderId: string): Promise<OrderDetails> => {
  const response = await apiFetch(`/api/orders/${orderId}`);

  if (!response.ok) {
    throw new Error('Failed to load order details');
  }

  const result: ApiResponse<OrderDetails> = await response.json();

  return result.data;
};

export const managerApproveOrder = async (orderId: string): Promise<OrderDetails> => {
  const response = await apiFetch(`/api/orders/${orderId}/manager-approve`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to approve order');
  }

  const result: ApiResponse<OrderDetails> = await response.json();

  return result.data;
};

export const managerRejectOrder = async (orderId: string): Promise<OrderDetails> => {
  const response = await apiFetch(`/api/orders/${orderId}/manager-reject`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to reject order');
  }

  const result: ApiResponse<OrderDetails> = await response.json();

  return result.data;
};
