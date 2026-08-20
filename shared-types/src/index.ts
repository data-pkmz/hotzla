import type { Product } from './product.types.js';

export type { UserRole, User } from './user.types.js';

export type {
  ProductType,
  Product,
  ProductAttributeDefinition,
  AttributeDisplayStyle,
  PricingRule,
  ProductAttributeOption,
  ProductDetails,
} from './product.types.js';

export { AttributeType, PricingImpactType, PriceModifierType } from './attribute.types.js';

export type {
  ProductAttributeOptionDto,
  CreateAttributeDto,
  UpdateAttributeDto,
} from './attribute.types.js';

export type {
  SelectedAttributeInput,
  CalculatePriceParams,
  PriceBreakdownLine,
  PriceResult,
} from './pricing.types.js';

// Cart structures
export type CartStatus = 'ACTIVE' | 'CONVERTED' | 'ABANDONED';

export interface Cart {
  id: string;
  userId: string;
  status: CartStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  items?: CartItem[];
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  uploadedFilePath?: string;
  computedPrice: number;
  selectedAttributes: Record<string, string | number | boolean>;
  product?: Product;
}

// Order structures
export type OrderStatus =
  | 'PENDING_BUDGET'
  | 'BUDGET_APPROVED'
  | 'APPROVED_FOR_PRODUCTION'
  | 'IN_PRINTING'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'REJECTED';

export interface Order {
  id: string;
  orderNumber: string;
  requesterId: string;
  unit: string;
  status: OrderStatus;
  budgetOfficerName: string;
  budgetOfficerEmail: string;
  totalPrice: number;
  approvedByManagerId: string | null;
  approvedByBudgetAt: Date | string | null;
  approvedByManagerAt: Date | string | null;
  workerId: string | null;
  completedAt: Date | string | null;
  createdAt: Date | string;
  items?: OrderItem[];
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

export interface OrderItemAttributeValue {
  id: string;
  orderItemId: string;
  attributeDefinitionId: string;
  selectedOptionId?: string;
  valueText: string;
}

// Order Status History
export type ChangeSource = 'SYSTEM' | 'EMAIL_BUDGET_OFFICER' | 'MANAGER_UI' | 'WORKER_UI';

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  changedByUserId?: string | null;
  changedBySource: ChangeSource;
  changedAt: Date | string;
  note?: string | null;
}

export interface LogStatusChangeParams {
  orderId: string;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  changedByUserId?: string;
  changedBySource: ChangeSource;
  note?: string;
}

// Approval Tokens
export interface ApprovalToken {
  id: string;
  orderId: string;
  token: string;
  isUsed: boolean;
  expiresAt: Date | string;
  usedAt?: Date | string;
}

// Email logs
export type EmailDirection = 'OUTBOUND' | 'INBOUND';
export type EmailProcessedStatus = 'PENDING' | 'MATCHED' | 'IGNORED' | 'ERROR';

export interface EmailLog {
  id: string;
  orderId?: string;
  direction: EmailDirection;
  toAddress: string;
  fromAddress: string;
  subject: string;
  processedStatus: EmailProcessedStatus;
  createdAt: Date | string;
}
