import type {
  Cart,
  CartItem,
  AddToCartInput,
  UpdateCartItemInput,
  CreateOrderInput,
  Order,
} from 'shared-types';

interface CartResponse {
  message: string;
  cart: Cart;
}

interface CartItemResponse {
  message: string;
  item: CartItem;
}

interface CheckoutResponse {
  message: string;
  order: Order;
}

export const getActiveCart = async (): Promise<Cart> => {
  const response = await fetch('/api/cart');

  if (!response.ok) {
    throw new Error('Failed to load active cart');
  }

  const result: CartResponse = await response.json();
  return result.cart;
};

export const addItemToCart = async (input: AddToCartInput): Promise<CartItem> => {
  const response = await fetch('/api/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to add item to cart');
  }

  const result: CartItemResponse = await response.json();
  return result.item;
};

export const updateCartItem = async (id: string, input: UpdateCartItemInput): Promise<CartItem> => {
  const response = await fetch(`/api/cart/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to update cart item');
  }

  const result: CartItemResponse = await response.json();
  return result.item;
};

export const removeCartItem = async (id: string): Promise<void> => {
  const response = await fetch(`/api/cart/items/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to remove cart item');
  }
};

export const checkoutCart = async (input: CreateOrderInput): Promise<Order> => {
  const response = await fetch('/api/cart/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to checkout');
  }

  const result: CheckoutResponse = await response.json();
  return result.order;
};
