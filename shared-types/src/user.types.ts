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
  isDeleted: boolean;
}

/**
 * Roles that a manager can assign through the application.
 * The MANAGER role cannot be assigned or removed through the site.
 */
export type AssignableUserRole = Extract<UserRole, 'REQUESTER' | 'WORKER'>;

/**
 * User information displayed on the Role Management page.
 * Excludes unnecessary personal information.
 */
export type RoleManagementUser = Pick<
  User,
  'id' | 'fullName' | 'adUsername' | 'militaryEmail' | 'unit' | 'role'
>;

/**
 * Response returned when retrieving users for role management.
 */
export interface GetRoleManagementUsersResponse {
  users: RoleManagementUser[];
}

/**
 * Request body for updating a user's role.
 */
export interface UpdateUserRoleRequest {
  role: AssignableUserRole;
}

/**
 * Response returned after successfully updating a user's role.
 */
export interface UpdateUserRoleResponse {
  user: RoleManagementUser;
}
