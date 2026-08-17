import { Checkbox, FormControlLabel, TextField } from '@mui/material';

import type { ProductAttributeDefinition, SelectedAttributeInput } from 'shared-types';

import NumberAttributeInput from './Inputs/NumberAttributeInputs';
import SelectAttributeInput from './Inputs/SelectAttributeInput';
import FileUploadAttributeInput from './Inputs/FileUploadAttributeInput';

interface DynamicAttributeInputProps {
  attributeDefinition: ProductAttributeDefinition;
  value?: SelectedAttributeInput;
  onChange: (value: SelectedAttributeInput, isValid: boolean) => void;
}

export default function DynamicAttributeInput({
  attributeDefinition,
  value,
  onChange,
}: DynamicAttributeInputProps) {
  const { id, attributeName, attributeType, isRequired } = attributeDefinition;

  switch (attributeType) {
    case 'SELECT':
      return (
        <SelectAttributeInput
          attributeDefinition={attributeDefinition}
          value={value}
          onChange={onChange}
        />
      );

    case 'NUMBER':
      return (
        <NumberAttributeInput
          attributeDefinition={attributeDefinition}
          value={value}
          onChange={onChange}
        />
      );

    case 'BOOLEAN': {
      const checked = typeof value?.value === 'boolean' ? value.value : false;

      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={checked}
              onChange={(event) => {
                const newValue = event.target.checked;

                onChange(
                  {
                    attributeDefinitionId: id,
                    value: newValue,
                  },
                  true
                );
              }}
            />
          }
          label={attributeName}
        />
      );
    }

    case 'TEXT': {
      const textValue = typeof value?.value === 'string' ? value.value : '';

      const hasError = isRequired && textValue.trim().length === 0;

      return (
        <TextField
          fullWidth
          label={attributeName}
          required={isRequired}
          value={textValue}
          error={hasError}
          helperText={hasError ? 'שדה זה הוא שדה חובה' : undefined}
          onChange={(event) => {
            const newValue = event.target.value;

            const isValid = !isRequired || newValue.trim().length > 0;

            onChange(
              {
                attributeDefinitionId: id,
                value: newValue,
              },
              isValid
            );
          }}
        />
      );
    }

    case 'FILE_UPLOAD':
      return (
        <FileUploadAttributeInput
          attributeDefinition={attributeDefinition}
          value={value}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}
