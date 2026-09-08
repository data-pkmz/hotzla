import { apiFetch } from '../api';

interface UploadFileResponse {
  filePath: string;
}

export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiFetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(error?.error || 'File upload failed');
  }

  const data: UploadFileResponse = await response.json();

  return data.filePath;
};

export const getProductImageUrl = (filePath?: string | null): string => {
  if (!filePath) return '';

  if (filePath.startsWith('/images/')) {
    return filePath;
  }

  return `/api/files/product-image?path=${encodeURIComponent(filePath)}`;
};
