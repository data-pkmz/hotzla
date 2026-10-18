import { OrderStatus } from 'shared-types';
import type { CartItem, Order, Product } from 'shared-types';

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-business-cards',
    name: 'כרטיסי ביקור',
    description: 'כרטיסי ביקור איכותיים, בהדפסה צבעונית ובגימור מקצועי.',
    imageUrl: '',
    category: 'דפוס',
    productType: 'FIXED',
    basePrice: 180,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 100,
    createdBy: null,
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'demo-flyers',
    name: 'פליירים',
    description: 'פליירים צבעוניים לחלוקה, בגודל A5.',
    imageUrl: '',
    category: 'דפוס',
    productType: 'FIXED',
    basePrice: 240,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 100,
    createdBy: null,
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'demo-info-sign',
    name: 'שלט מידע',
    description: 'שלט מודפס בגודל A3, להמחשת מוצר עם אפשרויות בחירה.',
    imageUrl: '',
    category: 'שילוט',
    productType: 'FIXED',
    basePrice: 95,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 100,
    createdBy: null,
    createdAt: '2026-10-01T00:00:00.000Z',
  },
];

export const DEMO_CART_ITEM: CartItem = {
  id: 'demo-cart-item',
  cartId: 'demo-cart',
  productId: DEMO_PRODUCTS[0].id,
  quantity: 500,
  computedPrice: 180,
  selectedAttributes: [],
  product: {
    ...DEMO_PRODUCTS[0],
    minQuantity: 500,
    maxQuantity: 500,
  },
};

export const DEMO_ORDERS: Order[] = [
  {
    id: 'demo-order-1042',
    orderNumber: 'DEMO-1042',
    requesterId: 'demo-user',
    requester: { id: 'demo-user', fullName: 'משתמש לדוגמה', unit: 'יחידת הדגמה' },
    unit: 'יחידת הדגמה',
    status: OrderStatus.PENDING_BUDGET,
    budgetOfficerName: 'קצין תקציב לדוגמה',
    budgetOfficerEmail: 'budget-demo@example.invalid',
    totalPrice: 320,
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'demo-order-1038',
    orderNumber: 'DEMO-1038',
    requesterId: 'demo-user',
    requester: { id: 'demo-user', fullName: 'משתמש לדוגמה', unit: 'יחידת הדגמה' },
    unit: 'יחידת הדגמה',
    status: OrderStatus.IN_PRODUCTION,
    budgetOfficerName: 'קצין תקציב לדוגמה',
    budgetOfficerEmail: 'budget-demo@example.invalid',
    totalPrice: 180,
    createdAt: '2026-09-15T00:00:00.000Z',
  },
];

export const DEMO_WORK_ORDERS: Order[] = [
  {
    ...DEMO_ORDERS[0],
    id: 'demo-work-order-2081',
    orderNumber: 'DEMO-2081',
    status: OrderStatus.APPROVED_FOR_PRODUCTION,
  },
  {
    ...DEMO_ORDERS[1],
    id: 'demo-work-order-2076',
    orderNumber: 'DEMO-2076',
    status: OrderStatus.IN_PRODUCTION,
  },
];
