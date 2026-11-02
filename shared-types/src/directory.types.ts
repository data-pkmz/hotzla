export interface ContactItem {
  displayName: string;
  email: string;
  department?: string;
  title?: string;
}

export interface DirectorySearchResponse {
  contacts: ContactItem[];
}
