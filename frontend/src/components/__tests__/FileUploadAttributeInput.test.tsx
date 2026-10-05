import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import FileUploadAttributeInput from '../DynamicAttributeInput/inputs/FileUploadAttributeInput';

import type { ProductAttributeDefinition } from 'shared-types';

const MB = 1024 * 1024;

const attributeDefinition: ProductAttributeDefinition = {
  id: 'attribute-file-upload',
  productId: 'product-1',
  attributeName: 'קובץ להדפסה',
  attributeType: 'FILE_UPLOAD',
  displayStyle: 'FILE_DROPZONE',
  isRequired: true,
  displayOrder: 0,
  pricingRule: 'NONE',
  unitPrice: null,
  minValue: null,
  maxValue: null,
  options: [],
};

describe('FileUploadAttributeInput', () => {
  const getFileInput = () => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;

    if (!input) {
      throw new Error('File input was not found');
    }

    return input;
  };

  it('accepts a valid PDF smaller than 20 MB', async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    const onChange = vi.fn();
    const onFileChange = vi.fn();

    render(
      <FileUploadAttributeInput
        attributeDefinition={attributeDefinition}
        onChange={onChange}
        onFileChange={onFileChange}
      />
    );

    const file = new File([new Uint8Array(1024)], 'document.pdf', {
      type: 'application/pdf',
    });

    await user.upload(getFileInput(), file);

    expect(screen.getByText('document.pdf')).toBeInTheDocument();

    expect(onChange).toHaveBeenLastCalledWith(
      {
        attributeDefinitionId: attributeDefinition.id,
      },
      true
    );

    expect(onFileChange).toHaveBeenLastCalledWith(file);

    expect(
      screen.queryByText('הקובץ שנבחר גדול מדי. הגודל המרבי המותר הוא 20MB.')
    ).not.toBeInTheDocument();
  });

  it('accepts a valid JPEG smaller than 20 MB', async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    const onChange = vi.fn();
    const onFileChange = vi.fn();

    render(
      <FileUploadAttributeInput
        attributeDefinition={attributeDefinition}
        onChange={onChange}
        onFileChange={onFileChange}
      />
    );

    const file = new File([new Uint8Array(1024)], 'image.jpg', {
      type: 'image/jpeg',
    });

    await user.upload(getFileInput(), file);

    expect(screen.getByText('image.jpg')).toBeInTheDocument();

    expect(onChange).toHaveBeenLastCalledWith(
      {
        attributeDefinitionId: attributeDefinition.id,
      },
      true
    );

    expect(onFileChange).toHaveBeenLastCalledWith(file);
  });

  it('accepts a valid PNG smaller than 20 MB', async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    const onChange = vi.fn();
    const onFileChange = vi.fn();

    render(
      <FileUploadAttributeInput
        attributeDefinition={attributeDefinition}
        onChange={onChange}
        onFileChange={onFileChange}
      />
    );

    const file = new File([new Uint8Array(1024)], 'image.png', {
      type: 'image/png',
    });

    await user.upload(getFileInput(), file);

    expect(screen.getByText('image.png')).toBeInTheDocument();

    expect(onChange).toHaveBeenLastCalledWith(
      {
        attributeDefinitionId: attributeDefinition.id,
      },
      true
    );

    expect(onFileChange).toHaveBeenLastCalledWith(file);
  });

  it('rejects a 20.5 MB file', async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    const onChange = vi.fn();
    const onFileChange = vi.fn();

    render(
      <FileUploadAttributeInput
        attributeDefinition={attributeDefinition}
        onChange={onChange}
        onFileChange={onFileChange}
      />
    );

    const file = new File([new Uint8Array(Math.floor(20.5 * MB))], 'too-large.pdf', {
      type: 'application/pdf',
    });

    await user.upload(getFileInput(), file);

    expect(
      screen.getByText('הקובץ שנבחר גדול מדי. הגודל המרבי המותר הוא 20MB.')
    ).toBeInTheDocument();

    expect(screen.queryByText('too-large.pdf')).not.toBeInTheDocument();

    expect(onChange).toHaveBeenLastCalledWith(
      {
        attributeDefinitionId: attributeDefinition.id,
      },
      false
    );

    expect(onFileChange).toHaveBeenLastCalledWith(null);
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
  ])('rejects $filename', async ({ filename, type }) => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    const onChange = vi.fn();
    const onFileChange = vi.fn();

    render(
      <FileUploadAttributeInput
        attributeDefinition={attributeDefinition}
        onChange={onChange}
        onFileChange={onFileChange}
      />
    );

    const file = new File([new Uint8Array(1024)], filename, {
      type,
    });

    await user.upload(getFileInput(), file);

    expect(
      screen.getByText('פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.')
    ).toBeInTheDocument();

    expect(screen.queryByText(filename)).not.toBeInTheDocument();

    expect(onChange).toHaveBeenLastCalledWith(
      {
        attributeDefinitionId: attributeDefinition.id,
      },
      false
    );

    expect(onFileChange).toHaveBeenLastCalledWith(null);
  });

  it('rejects an .exe file even when its MIME type claims to be PDF', async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    const onChange = vi.fn();
    const onFileChange = vi.fn();

    render(
      <FileUploadAttributeInput
        attributeDefinition={attributeDefinition}
        onChange={onChange}
        onFileChange={onFileChange}
      />
    );

    const file = new File([new Uint8Array(1024)], 'program.exe', {
      type: 'application/pdf',
    });

    await user.upload(getFileInput(), file);

    expect(
      screen.getByText('פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.')
    ).toBeInTheDocument();

    expect(screen.queryByText('program.exe')).not.toBeInTheDocument();

    expect(onChange).toHaveBeenLastCalledWith(
      {
        attributeDefinitionId: attributeDefinition.id,
      },
      false
    );

    expect(onFileChange).toHaveBeenLastCalledWith(null);
  });

  it('marks a required file field invalid when the selected file is removed', async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    const onChange = vi.fn();
    const onFileChange = vi.fn();

    render(
      <FileUploadAttributeInput
        attributeDefinition={attributeDefinition}
        onChange={onChange}
        onFileChange={onFileChange}
      />
    );

    const file = new File([new Uint8Array(1024)], 'document.pdf', {
      type: 'application/pdf',
    });

    await user.upload(getFileInput(), file);

    expect(screen.getByText('document.pdf')).toBeInTheDocument();

    expect(onFileChange).toHaveBeenLastCalledWith(file);

    await user.click(
      screen.getByRole('button', {
        name: 'הסרת קובץ',
      })
    );

    expect(screen.queryByText('document.pdf')).not.toBeInTheDocument();

    expect(onChange).toHaveBeenLastCalledWith(
      {
        attributeDefinitionId: attributeDefinition.id,
      },
      false
    );

    expect(onFileChange).toHaveBeenLastCalledWith(null);
  });
});
