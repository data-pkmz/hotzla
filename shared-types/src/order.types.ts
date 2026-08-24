import type { Product } from './product.types.js';
import type { User } from './user.types.js';

export type OrderStatus =
  | 'PENDING_BUDGET'
  | 'BUDGET_APPROVED'
  | 'APPROVED_FOR_PRODUCTION'
  | 'IN_PRINTING'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'REJECTED';

export type ChangeSource = 'SYSTEM' | 'EMAIL_BUDGET_OFFICER' | 'MANAGER_UI' | 'WORKER_UI';

export interface OrderItemAttributeValue {
  id: string;
  orderItemId: string;
  attributeDefinitionId: string;
  selectedOptionId?: string | null;
  valueText: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  uploadedFilePath?: string;
  computedUnitPrice: number;
  computedTotalPrice: number;
  attributeValues?: OrderItemAttributeValue[];
  product?: Product;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  changedByUserId?: string | null;
  changedBySource: ChangeSource;
  changedAt: Date | string;
  note?: string | null;
  changedByUser?: Partial<User> | null;
}

export interface LogStatusChangeParams {
  orderId: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  changedByUserId?: string | null;
  changedBySource: ChangeSource;
  note?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  requesterId: string;
  requester?: Partial<User>;
  unit: string;
  status: OrderStatus;
  budgetOfficerName: string;
  budgetOfficerEmail: string;
  totalPrice: number;
  approvedByManagerId?: string | null;
  approvedByManager?: Partial<User> | null;
  approvedByManagerAt?: Date | string | null;
  workerId?: string | null;
  worker?: Partial<User> | null;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  isDeleted?: boolean;
  items?: OrderItem[];
  orderStatus?: OrderStatusHistory[];
}

export interface CreateOrderInput {
  budgetOfficerName: string;
  budgetOfficerEmail: string;
  unit?: string;
  notes?: string;
}

export interface OrderQueryParams {
  status?: OrderStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'orderNumber' | 'totalPrice' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
