import { apiFetch } from '../api';
import { useAuthStore } from '../../store/useAuthStore';

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

const appendMockAuth = (url: string): string => {
  const isMockAuthEnabled = import.meta.env.VITE_ENABLE_MOCK_AUTH !== 'false';
  if (isMockAuthEnabled) {
    const { currentUser } = useAuthStore.getState();
    if (currentUser?.adUsername) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}mockUser=${encodeURIComponent(currentUser.adUsername)}`;
    }
  }
  return url;
};

export const getProductImageUrl = (filePath?: string | null): string => {
  if (!filePath) return '';

  if (filePath.startsWith('/images/')) {
    return filePath;
  }

  return appendMockAuth(`/api/files/product-image?path=${encodeURIComponent(filePath)}`);
};

export const getDownloadFileUrl = (filePath?: string | null): string => {
  if (!filePath) return '';
  return appendMockAuth(`/api/files/download?path=${encodeURIComponent(filePath)}`);
};

export const downloadFile = async (filePath: string, fileName: string): Promise<void> => {
  const response = await apiFetch(`/api/files/download?path=${encodeURIComponent(filePath)}`);

  if (!response.ok) {
    throw new Error('Failed to download file');
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(downloadUrl);
};
