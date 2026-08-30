import type { Product } from './product.types.js';

export type { UserRole, User } from './user.types.js';

export type {
  ProductType,
  Product,
  ProductAttributeDefinition,
  PricingRule,
  ProductAttributeOption,
  ProductDetails,
} from './product.types.js';

export {
  AttributeType,
  PricingImpactType,
  PriceModifierType,
  AttributeDisplayStyle,
} from './attribute.types.js';

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
  cartItemEntries?: CartItem[];
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  uploadedFilePath?: string;
  computedPrice: number;
  selectedAttributes: Record<string, string | number | boolean>;
  product?: Product;
}

// Order Status History
export type ChangeSource = 'SYSTEM' | 'EMAIL_BUDGET_OFFICER' | 'MANAGER_UI' | 'WORKER_UI';

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
export * from './cart.types.js';
export * from './order.types.js';
