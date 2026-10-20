import type { Cart, CartItem } from 'shared-types';

export const getCartItems = (cart?: Cart | null): CartItem[] => {
  if (cart?.items?.length) {
    return cart.items;
  }

  return cart?.cartItemEntries ?? [];
};
