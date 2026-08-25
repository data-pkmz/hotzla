import { create } from 'zustand';

export type UserRole = 'REQUESTER' | 'MANAGER' | 'WORKER';

export interface User {
  id: string;
  name: string;
  email: string;
  adUsername: string;
  role: UserRole;
  unit?: string;
}

// משתמשי דמו לבדיקה מקומית
export const MOCK_USERS: Record<UserRole, User> = {
  REQUESTER: {
    id: 'usr-1',
    name: 'משתמש מבקש',
    email: 'requester@example.com',
    adUsername: 'requester',
    role: 'REQUESTER',
    unit: 'יחידת פיתוח',
  },

  MANAGER: {
    id: 'usr-2',
    name: 'מנהל מערכת',
    email: 'manager@example.com',
    adUsername: 'manager',
    role: 'MANAGER',
    unit: 'יחידת פיתוח',
  },

  WORKER: {
    id: 'usr-3',
    name: 'עובד דפוס',
    email: 'worker@example.com',
    adUsername: 'worker',
    role: 'WORKER',
    unit: 'בית דפוס',
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
