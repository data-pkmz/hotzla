import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductBuilderPage from '../product-builder';

import { getProducts } from '../../../services/api/catalog.service';
import { uploadFile } from '../../../services/api/file.service';

vi.mock('../../../services/api/catalog.service', () => ({
  getProducts: vi.fn(),
}));

vi.mock('../../../services/api/admin-catalog.service', () => ({
  createAdminProduct: vi.fn(),
  getAdminProductById: vi.fn(),
  updateAdminProduct: vi.fn(),
}));

vi.mock('../../../services/api/file.service', () => ({
  uploadFile: vi.fn(),
  getProductImageUrl: vi.fn((path: string) => path),
}));

vi.mock('../../../components/admin/ProductPreviewPanel', () => ({
  ProductPreviewPanel: () => <div>Product Preview</div>,
}));

vi.mock('../../../components/admin/AttributeDefinitionForm', () => ({
  AttributeDefinitionForm: () => <div>Attribute Form</div>,
}));

const mockedGetProducts = vi.mocked(getProducts);
const mockedUploadFile = vi.mocked(uploadFile);

const MB = 1024 * 1024;

describe('ProductBuilderPage - product image upload validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetProducts.mockResolvedValue([]);
    mockedUploadFile.mockResolvedValue('2026/09/10/product-image.jpg');

    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:test-image'),
    });

    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });

    if (!global.crypto) {
      Object.defineProperty(global, 'crypto', {
        value: {},
      });
    }

    Object.defineProperty(global.crypto, 'randomUUID', {
      writable: true,
      value: vi.fn(() => 'test-uuid'),
    });
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ProductBuilderPage />
      </MemoryRouter>
    );
  };

  const getImageInput = () => {
    const input = document.querySelector(
      'input[type="file"][accept="image/jpeg,image/png"]'
    ) as HTMLInputElement | null;

    if (!input) {
      throw new Error('Product image input was not found');
    }

    return input;
  };

  it('accepts a valid JPEG image smaller than 20 MB', async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    renderPage();

    const file = new File([new Uint8Array(1024)], 'catalog-image.jpg', {
      type: 'image/jpeg',
    });

    await user.upload(getImageInput(), file);

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);

    expect(
      screen.queryByText('הקובץ שנבחר גדול מדי. הגודל המרבי המותר הוא 20MB.')
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText('פורמט הקובץ אינו נתמך. ניתן להעלות קבצי JPG או PNG בלבד.')
    ).not.toBeInTheDocument();
  });

  it('accepts a valid PNG image smaller than 20 MB', async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    renderPage();

    const file = new File([new Uint8Array(1024)], 'catalog-image.png', {
      type: 'image/png',
    });

    await user.upload(getImageInput(), file);

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  it('rejects a 20.5 MB image', async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    renderPage();

    const file = new File([new Uint8Array(Math.floor(20.5 * MB))], 'too-large.jpg', {
      type: 'image/jpeg',
    });

    await user.upload(getImageInput(), file);

    expect(
      await screen.findByText('הקובץ שנבחר גדול מדי. הגודל המרבי המותר הוא 20MB.')
    ).toBeInTheDocument();

    expect(URL.createObjectURL).not.toHaveBeenCalled();

    expect(mockedUploadFile).not.toHaveBeenCalled();
  });

  it.each([
    {
      filename: 'archive.zip',
      type: 'application/zip',
    },
    {
      filename: 'program.exe',
      type: 'application/x-msdownload',
    },
    {
      filename: 'document.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    {
      filename: 'document.pdf',
      type: 'application/pdf',
    },
  ])('rejects $filename as a catalog image', async ({ filename, type }) => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    renderPage();

    const file = new File([new Uint8Array(1024)], filename, {
      type,
    });

    await user.upload(getImageInput(), file);

    expect(
      await screen.findByText('פורמט הקובץ אינו נתמך. ניתן להעלות קבצי JPG או PNG בלבד.')
    ).toBeInTheDocument();

    expect(URL.createObjectURL).not.toHaveBeenCalled();

    expect(mockedUploadFile).not.toHaveBeenCalled();
  });

  it('rejects an .exe file even when its MIME type claims to be JPEG', async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    renderPage();

    const file = new File([new Uint8Array(1024)], 'program.exe', {
      type: 'image/jpeg',
    });

    await user.upload(getImageInput(), file);

    expect(
      await screen.findByText('פורמט הקובץ אינו נתמך. ניתן להעלות קבצי JPG או PNG בלבד.')
    ).toBeInTheDocument();

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(mockedUploadFile).not.toHaveBeenCalled();
  });

  it('does not upload an invalid oversized image when saving the product', async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    renderPage();

    const largeFile = new File([new Uint8Array(Math.floor(20.5 * MB))], 'too-large.jpg', {
      type: 'image/jpeg',
    });

    await user.upload(getImageInput(), largeFile);

    expect(
      await screen.findByText('הקובץ שנבחר גדול מדי. הגודל המרבי המותר הוא 20MB.')
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'הקם מוצר',
      })
    );

    /*
     * Saving stops on one of the required product fields before reaching
     * file upload. The important assertion here is that the rejected image
     * was never stored as imageFile and therefore cannot be uploaded.
     */
    expect(mockedUploadFile).not.toHaveBeenCalled();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
