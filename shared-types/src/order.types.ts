import type { Product } from './product.types.js';
import type { User, UserRole } from './user.types.js';
import type { OrderStatus } from './status.types.js';

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
  quantity: number;
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

export interface OrderDetailsUser {
  id: string;
  fullName?: string | null;
  militaryEmail?: string | null;
  unit?: string | null;
  phone?: string | null;
}

export interface OrderDetailsAttribute {
  id: string;
  valueText: string;
  attributeDefinition: {
    id: string;
    attributeName: string;
  };
  selectedOption?: {
    id: string;
    optionLabel: string;
    optionValue: string;
  } | null;
}

export interface OrderDetailsItem {
  id: string;
  quantity: number | string;
  uploadedFilePath: string;
  computedUnitPrice: number | string;
  computedTotalPrice: number | string;

  product: {
    id: string;
    name: string;
  };

  itemAttributeEntries: OrderDetailsAttribute[];
}

export interface OrderDetailsStatusHistory {
  id: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  changedAt: Date | string;
  note?: string | null;

  changedByUser?: {
    id: string;
    fullName?: string | null;
    role?: UserRole;
  } | null;
}

export interface OrderDetails {
  id: string;
  orderNumber: string;
  createdAt: Date | string;
  totalPrice: number | string;
  status: OrderStatus;

  budgetOfficerName: string;
  budgetOfficerEmail: string;

  requester: OrderDetailsUser;
  approvedByManager?: OrderDetailsUser | null;
  worker?: OrderDetailsUser | null;

  itemEntries: OrderDetailsItem[];
  orderStatus: OrderDetailsStatusHistory[];
}
