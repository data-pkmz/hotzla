import { useState } from 'react';
import { TextField } from '@mui/material';

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

  const validate = (rawValue: string): { isValid: boolean; error?: string } => {
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
    <TextField
      fullWidth
      type="number"
      label={attributeName}
      required={isRequired}
      value={inputValue}
      error={!validation.isValid}
      helperText={validation.error}
      inputProps={{
        min: minValue ?? undefined,
        max: maxValue ?? undefined,
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
  );
}
