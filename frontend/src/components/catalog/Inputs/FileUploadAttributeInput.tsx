import { useState } from 'react';
import { Button, FormControl, FormHelperText, Stack, Typography } from '@mui/material';

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

  const isValid = !isRequired || file !== null;

  return (
    <FormControl fullWidth error={!isValid}>
      <Stack spacing={1}>
        <Typography variant="body2">
          {attributeName}
          {isRequired ? ' *' : ''}
        </Typography>

        <Button variant="outlined" component="label">
          Choose file
          <input
            hidden
            type="file"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0] ?? null;

              setFile(selectedFile);

              onChange(
                {
                  attributeDefinitionId: id,
                },
                !isRequired || selectedFile !== null
              );
            }}
          />
        </Button>

        {file && (
          <Typography variant="body2" color="text.secondary">
            {file.name}
          </Typography>
        )}

        {!isValid && <FormHelperText>יש לבחור קובץ</FormHelperText>}
      </Stack>
    </FormControl>
  );
}
