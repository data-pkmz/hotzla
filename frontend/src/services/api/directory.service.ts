import { apiFetch } from '../api';
import type { ContactItem, DirectorySearchResponse } from 'shared-types';

/**
 * Searches organizational contacts in Outlook / Active Directory via backend directory service.
 *
 * @param query The search string (at least 2 characters)
 */
export const searchDirectoryContacts = async (query: string): Promise<ContactItem[]> => {
  const clean = query?.trim() ?? '';
  if (clean.length < 2) {
    return [];
  }

  const response = await apiFetch(`/api/directory/contacts?q=${encodeURIComponent(clean)}`);

  if (!response.ok) {
    throw new Error('Failed to search directory contacts');
  }

  const data: DirectorySearchResponse = await response.json();
  return data.contacts || [];
};

export const searchContacts = searchDirectoryContacts;
