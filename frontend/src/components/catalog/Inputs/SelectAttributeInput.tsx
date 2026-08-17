import { FormControl, FormHelperText, InputLabel, MenuItem, Select } from '@mui/material';

import type { ProductAttributeDefinition, SelectedAttributeInput } from 'shared-types';

interface SelectAttributeInputProps {
  attributeDefinition: ProductAttributeDefinition;
  value?: SelectedAttributeInput;
  onChange: (value: SelectedAttributeInput, isValid: boolean) => void;
}

export default function SelectAttributeInput({
  attributeDefinition,
  value,
  onChange,
}: SelectAttributeInputProps) {
  const { id, attributeName, isRequired, options = [] } = attributeDefinition;

  const selectedOptionId = value?.selectedOptionIds?.[0] ?? '';

  const isValid = !isRequired || selectedOptionId !== '';

  const sortedOptions = [...options].sort((a, b) => a.displayOrder - b.displayOrder);

  const handleChange = (optionId: string) => {
    onChange(
      {
        attributeDefinitionId: id,
        selectedOptionIds: optionId ? [optionId] : [],
      },
      !isRequired || optionId !== ''
    );
  };

  return (
    <FormControl fullWidth required={isRequired} error={!isValid}>
      <InputLabel>{attributeName}</InputLabel>

      <Select
        value={selectedOptionId}
        label={attributeName}
        onChange={(event) => handleChange(event.target.value)}
      >
        {!isRequired && (
          <MenuItem value="">
            <em>ללא בחירה</em>
          </MenuItem>
        )}

        {sortedOptions.map((option) => (
          <MenuItem key={option.id} value={option.id}>
            {option.optionLabel}
          </MenuItem>
        ))}
      </Select>

      {!isValid && <FormHelperText>יש לבחור אפשרות</FormHelperText>}
    </FormControl>
  );
}
