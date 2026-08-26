import { create } from 'zustand';

export type UserRole = 'REQUESTER' | 'MANAGER' | 'WORKER';

export type MockUserKey = 'REQUESTER_ONE' | 'REQUESTER_TWO' | 'MANAGER' | 'WORKER';

export interface User {
  id: string;
  name: string;
  email: string;
  adUsername: string;
  role: UserRole;
  unit?: string;
}

export const MOCK_USERS: Record<MockUserKey, User> = {
  REQUESTER_ONE: {
    id: 'usr-1',
    name: 'משתמש מבקש',
    email: 'requester@example.com',
    adUsername: 'requester',
    role: 'REQUESTER',
    unit: 'יחידת פיתוח',
  },

  REQUESTER_TWO: {
    id: 'usr-4',
    name: 'משתמש מבקש נוסף',
    email: 'requester2@example.com',
    adUsername: 'requester2',
    role: 'REQUESTER',
    unit: 'יחידת בדיקות',
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
  setUser: (userKey: MockUserKey) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: MOCK_USERS.REQUESTER_ONE,

  setUser: (userKey: MockUserKey) =>
    set({
      currentUser: MOCK_USERS[userKey],
    }),
}));
