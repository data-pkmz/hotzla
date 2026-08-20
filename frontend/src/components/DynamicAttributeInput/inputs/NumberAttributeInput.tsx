import { useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';

import type { ProductAttributeDefinition, SelectedAttributeInput } from 'shared-types';

interface NumberAttributeInputProps {
  attributeDefinition: ProductAttributeDefinition;
  value?: SelectedAttributeInput;
  onChange: (value: SelectedAttributeInput, isValid: boolean) => void;
}

export default function NumberAttributeInput({
  attributeDefinition,
  value,
  onChange,
}: NumberAttributeInputProps) {
  const { id, attributeName, isRequired, minValue, maxValue } = attributeDefinition;

  const [inputValue, setInputValue] = useState(
    typeof value?.value === 'number' ? String(value.value) : ''
  );

  const validate = (
    rawValue: string
  ): {
    isValid: boolean;
    error?: string;
  } => {
    if (rawValue === '') {
      if (isRequired) {
        return {
          isValid: false,
          error: 'שדה זה הוא שדה חובה',
        };
      }

      return { isValid: true };
    }

    const numberValue = Number(rawValue);

    if (!Number.isFinite(numberValue)) {
      return {
        isValid: false,
        error: 'יש להזין מספר תקין',
      };
    }

    if (minValue !== null && numberValue < minValue) {
      return {
        isValid: false,
        error: `הערך חייב להיות לפחות ${minValue}`,
      };
    }

    if (maxValue !== null && numberValue > maxValue) {
      return {
        isValid: false,
        error: `הערך חייב להיות לכל היותר ${maxValue}`,
      };
    }

    return { isValid: true };
  };

  const validation = validate(inputValue);

  return (
    <Box
      sx={{
        direction: 'ltr',
        textAlign: 'left',
      }}
    >
      <Typography
        variant="body2"
        sx={{
          mb: 0.75,
          fontWeight: 500,
        }}
      >
        {attributeName}
        {isRequired ? ' *' : ''}
      </Typography>

      <TextField
        fullWidth
        type="number"
        size="small"
        value={inputValue}
        error={!validation.isValid}
        helperText={validation.error}
        inputProps={{
          min: minValue ?? undefined,
          max: maxValue ?? undefined,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            height: 40,
          },
        }}
        onChange={(event) => {
          const rawValue = event.target.value;

          setInputValue(rawValue);

          const result = validate(rawValue);

          onChange(
            {
              attributeDefinitionId: id,
              value: rawValue === '' ? undefined : Number(rawValue),
            },
            result.isValid
          );
        }}
      />
    </Box>
  );
}
