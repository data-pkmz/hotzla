import { useState } from 'react';
import { Box, Button, FormControl, FormHelperText, Typography } from '@mui/material';

import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';

import type { ProductAttributeDefinition, SelectedAttributeInput } from 'shared-types';

interface FileUploadAttributeInputProps {
  attributeDefinition: ProductAttributeDefinition;
  value?: SelectedAttributeInput;
  onChange: (value: SelectedAttributeInput, isValid: boolean) => void;
}

export default function FileUploadAttributeInput({
  attributeDefinition,
  onChange,
}: FileUploadAttributeInputProps) {
  const { id, attributeName, isRequired } = attributeDefinition;

  const [file, setFile] = useState<File | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const isValid = !isRequired || file !== null;

  const MAX_FILE_SIZE = 20 * 1024 * 1024;

  const [fileError, setFileError] = useState<string | null>(null);

  const handleFile = (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      setFileError(null);

      onChange(
        {
          attributeDefinitionId: id,
        },
        !isRequired
      );

      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError('גודל הקובץ המרבי הוא 20MB');

      onChange(
        {
          attributeDefinitionId: id,
        },
        false
      );

      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg'];

    if (!allowedTypes.includes(selectedFile.type)) {
      setFile(null);
      setFileError('ניתן להעלות קובצי PDF או JPEG בלבד');

      onChange(
        {
          attributeDefinitionId: id,
        },
        false
      );

      return;
    }

    setFile(selectedFile);
    setFileError(null);

    onChange(
      {
        attributeDefinitionId: id,
      },
      true
    );
  };

  return (
    <FormControl fullWidth error={!isValid}>
      <Typography
        variant="body2"
        sx={{
          direction: 'ltr',
          mb: 1,
          fontWeight: 500,
        }}
      >
        {attributeName}
        {isRequired ? ' *' : ''}
      </Typography>

      <Box
        component="label"
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);

          const droppedFile = event.dataTransfer.files?.[0] ?? null;

          handleFile(droppedFile);
        }}
        sx={{
          minHeight: 190,
          border: '1px dashed',
          borderColor: isDragging ? 'primary.main' : 'grey.400',
          borderRadius: 2,
          bgcolor: isDragging ? 'rgba(25, 118, 210, 0.04)' : 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 3,
          cursor: 'pointer',
          transition: 'border-color 0.15s ease, background-color 0.15s ease',
          '&:hover': {
            borderColor: 'primary.main',
          },
        }}
      >
        <input
          hidden
          type="file"
          accept=".pdf,.jpg,.jpeg,image/jpeg,application/pdf"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] ?? null;

            handleFile(selectedFile);
          }}
        />

        <Box
          sx={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            bgcolor: 'rgba(25, 118, 210, 0.1)',
            color: 'primary.main',
            mb: 1.5,
          }}
        >
          <CloudUploadOutlinedIcon />
        </Box>

        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
          }}
        >
          גררו ושחררו קבצים כאן
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            mt: 0.5,
          }}
        >
          PDF או JPEG, עד 20MB
        </Typography>

        <Button
          variant="outlined"
          component="span"
          size="small"
          sx={{
            mt: 2,
            px: 3,
            color: 'primary.main',
            borderColor: 'rgba(25, 118, 210, 0.1)',
            bgcolor: 'rgba(25, 118, 210, 0.1)',
            '&:hover': {
              color: 'primary.dark',
              borderColor: 'rgba(25, 118, 210, 0.2)',
              bgcolor: 'rgba(25, 118, 210, 0.18)',
            },
          }}
        >
          בחירת קובץ
        </Button>
      </Box>

      {file && (
        <Box
          sx={{
            mt: 1.5,
            px: 1.5,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            direction: 'rtl',
          }}
        >
          <InsertDriveFileOutlinedIcon color="primary" fontSize="small" />

          <Typography
            variant="body2"
            sx={{
              flexGrow: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {file.name}
          </Typography>

          <IconButton
            size="small"
            aria-label="הסרת קובץ"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();

              handleFile(null);
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      {fileError && <FormHelperText error>{fileError}</FormHelperText>}

      {!isValid && <FormHelperText>יש לבחור קובץ</FormHelperText>}
    </FormControl>
  );
}
