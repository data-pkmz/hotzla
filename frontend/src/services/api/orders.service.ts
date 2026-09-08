import type { Order, OrderDetails, OrderListResponse, OrderQueryParams } from 'shared-types';
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

export const getOrders = async (params: OrderQueryParams = {}): Promise<OrderListResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy);
  }

  if (params.sortOrder) {
    searchParams.set('sortOrder', params.sortOrder);
  }

  const queryString = searchParams.toString();

  const response = await apiFetch(`/api/orders${queryString ? `?${queryString}` : ''}`);

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
