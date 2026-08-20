import { Checkbox, FormControlLabel, Switch, TextField, Typography } from '@mui/material';

import type { ProductAttributeDefinition, SelectedAttributeInput } from 'shared-types';

import NumberAttributeInput from './inputs/NumberAttributeInput';
import SelectAttributeInput from './inputs/SelectAttributeInput';
import FileUploadAttributeInput from './inputs/FileUploadAttributeInput';

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
  const { id, attributeName, attributeType, displayStyle, isRequired } = attributeDefinition;

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

      const handleBooleanChange = (newValue: boolean) => {
        onChange(
          {
            attributeDefinitionId: id,
            value: newValue,
          },
          true
        );
      };

      const control =
        displayStyle === 'SWITCH' ? (
          <Switch
            checked={checked}
            size="small"
            onChange={(event) => handleBooleanChange(event.target.checked)}
          />
        ) : (
          <Checkbox
            checked={checked}
            size="small"
            onChange={(event) => handleBooleanChange(event.target.checked)}
          />
        );

      return (
        <FormControlLabel
          control={control}
          label={<Typography variant="body2">{attributeName}</Typography>}
          sx={{
            m: 0,
          }}
        />
      );
    }

    case 'TEXT': {
      const textValue = typeof value?.value === 'string' ? value.value : '';

      const hasError = isRequired && textValue.trim().length === 0;

      const isMultiline = displayStyle === 'MULTI_LINE';

      return (
        <div>
          <Typography
            variant="body2"
            sx={{
              direction: 'ltr',
              mb: 0.75,
              fontWeight: 500,
            }}
          >
            {attributeName}
            {isRequired ? ' *' : ''}
          </Typography>

          <TextField
            fullWidth
            size="small"
            multiline={isMultiline}
            minRows={isMultiline ? 4 : undefined}
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
            sx={
              isMultiline
                ? {
                    direction: 'ltr',
                    textAlign: 'left',
                  }
                : {
                    direction: 'ltr',
                    textAlign: 'right',
                    '& .MuiOutlinedInput-root': {
                      height: 40,
                    },
                  }
            }
          />
        </div>
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
