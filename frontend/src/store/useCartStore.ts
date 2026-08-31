import { create } from 'zustand';

interface CartState {
  isRecoveryBannerDismissed: boolean;
  dismissRecoveryBanner: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  isRecoveryBannerDismissed: false,
  dismissRecoveryBanner: () => set({ isRecoveryBannerDismissed: true }),
}));
