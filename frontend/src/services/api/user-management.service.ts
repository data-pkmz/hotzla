import type {
  AssignableUserRole,
  GetRoleManagementUsersResponse,
  UpdateUserRoleRequest,
  UpdateUserRoleResponse,
} from 'shared-types';

import { apiFetch } from '../api';

/**
 * Retrieves all active users for the Role Management page.
 *
 * Only managers are authorized to access this endpoint.
 *
 * GET /api/admin/users
 */
export async function getUsersForRoleManagement(): Promise<GetRoleManagementUsersResponse> {
  const response = await apiFetch('/api/admin/users');

  if (!response.ok) {
    throw new Error('שגיאה בטעינת רשימת המשתמשים');
  }

  return (await response.json()) as GetRoleManagementUsersResponse;
}

/**
 * Updates a user's role.
 *
 * Permitted roles:
 * - REQUESTER
 * - WORKER
 *
 * The backend prevents assigning the MANAGER role
 * or modifying existing manager accounts.
 *
 * PATCH /api/admin/users/:id/role
 */
export async function updateUserRole(
  userId: string,
  role: AssignableUserRole
): Promise<UpdateUserRoleResponse> {
  const payload: UpdateUserRoleRequest = {
    role,
  };

  const response = await apiFetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Attempt to display the error returned by the backend.
    const errorResponse: unknown = await response.json().catch(() => null);

    let errorMessage = 'שגיאה בעדכון תפקיד המשתמש';

    if (
      typeof errorResponse === 'object' &&
      errorResponse !== null &&
      'message' in errorResponse &&
      typeof errorResponse.message === 'string'
    ) {
      errorMessage = errorResponse.message;
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as UpdateUserRoleResponse;
}
