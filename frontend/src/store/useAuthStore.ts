import { create } from 'zustand';

export type UserRole = 'REQUESTER' | 'MANAGER' | 'WORKER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  unit?: string;
}

// משתמשי דמו לבדיקה מקומית
export const MOCK_USERS: Record<UserRole, User> = {
  REQUESTER: {
    id: 'usr-1',
    name: 'ישראל ישראלי (מזמין)',
    email: 'israel@org.gov.il',
    role: 'REQUESTER',
    unit: 'ענף מבצעים',
  },
  MANAGER: {
    id: 'usr-2',
    name: 'אבי מנהל (מנהל הוצל"א)',
    email: 'avi.manager@org.gov.il',
    role: 'MANAGER',
    unit: 'בית הדפוס',
  },
  WORKER: {
    id: 'usr-3',
    name: 'דני עובד (עובד דפוס)',
    email: 'dani.worker@org.gov.il',
    role: 'WORKER',
    unit: 'בית הדפוס',
  },
};

interface AuthState {
  currentUser: User;
  setRole: (role: UserRole) => void;
  setUserRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: MOCK_USERS.REQUESTER,
  setRole: (role: UserRole) => set({ currentUser: MOCK_USERS[role] }),
  setUserRole: (role: UserRole) => set({ currentUser: MOCK_USERS[role] }),
}));
