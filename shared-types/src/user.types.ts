// Enums for Users
export type UserRole = 'REQUESTER' | 'MANAGER' | 'WORKER';

export interface User {
  id: string;
  fullName: string | null;
  militaryEmail: string | null;
  adUsername: string;
  unit: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: Date | string;
}
