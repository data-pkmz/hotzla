import React from 'react';

interface FileUploadDropzoneProps {
  onFileSelect: (file: File) => void;
  allowedTypes?: string[];
  maxSizeMB?: number;
}

export const FileUploadDropzone: React.FC<FileUploadDropzoneProps> = ({
  onFileSelect,
  allowedTypes = ['application/pdf', 'image/jpeg'],
  maxSizeMB = 20,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!allowedTypes.includes(file.type)) {
        alert('סוג קובץ לא נתמך');
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`הקובץ גדול מדי. הגודל המקסימלי הוא ${maxSizeMB}MB`);
        return;
      }
      onFileSelect(file);
    }
  };

  return (
    <div
      className="file-upload-dropzone"
      style={{
        border: '2px dashed #ccc',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        background: '#fafafa',
        cursor: 'pointer',
      }}
    >
      <input
        type="file"
        onChange={handleFileChange}
        accept={allowedTypes.join(',')}
        style={{ display: 'none' }}
        id="dropzone-file-input"
      />
      <label htmlFor="dropzone-file-input" style={{ cursor: 'pointer' }}>
        <div>לחץ להעלאת קובץ PDF או תמונה (עד {maxSizeMB}MB)</div>
      </label>
    </div>
  );
};
export default FileUploadDropzone;
