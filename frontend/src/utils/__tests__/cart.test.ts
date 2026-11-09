import { describe, expect, it } from 'vitest';
import type { CartItem } from 'shared-types';

import { getCartItems } from '../cart';

const cartItem: CartItem = {
  id: 'cart-item-1',
  cartId: 'cart-1',
  productId: 'product-1',
  quantity: 2,
  computedPrice: 20,
  selectedAttributes: [],
};

const createCart = (overrides: Partial<Parameters<typeof getCartItems>[0]> = {}) => ({
  id: 'cart-1',
  userId: 'user-1',
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('getCartItems', () => {
  it('uses cartItemEntries when items exists but is empty', () => {
    expect(getCartItems(createCart({ items: [], cartItemEntries: [cartItem] }))).toEqual([
      cartItem,
    ]);
  });

  it('uses items when it contains cart entries', () => {
    expect(getCartItems(createCart({ items: [cartItem], cartItemEntries: [] }))).toEqual([
      cartItem,
    ]);
  });

  it('returns an empty list when the cart has no entries', () => {
    expect(getCartItems(createCart({ items: [], cartItemEntries: [] }))).toEqual([]);
    expect(getCartItems()).toEqual([]);
  });
});
