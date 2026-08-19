import {
  Box,
  ButtonBase,
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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
  const { id, attributeName, displayStyle, isRequired, options = [] } = attributeDefinition;
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

  if (displayStyle === 'CARDS') {
    return (
      <FormControl fullWidth required={isRequired} error={!isValid}>
        <Typography
          variant="body2"
          sx={{
            textAlign: 'left',
            mb: 1,
            fontWeight: 500,
          }}
        >
          {attributeName}
          {isRequired ? ' *' : ''}
        </Typography>

        <Box
          role="radiogroup"
          sx={{
            direction: 'ltr',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: `repeat(${Math.min(sortedOptions.length, 3)}, minmax(0, 1fr))`,
            },
            gap: 1.5,
          }}
        >
          {sortedOptions.map((option) => {
            const selected = selectedOptionId === option.id;

            return (
              <ButtonBase
                key={option.id}
                role="radio"
                aria-checked={selected}
                onClick={() => handleChange(option.id)}
                sx={{
                  position: 'relative',
                  display: 'block',
                  width: '100%',
                  minHeight: 96,
                  p: 1.5,
                  textAlign: 'left',
                  border: '1px solid',
                  borderColor: selected ? 'primary.main' : 'divider',
                  borderRadius: 1.5,
                  bgcolor: selected ? 'rgba(25, 118, 210, 0.05)' : 'background.paper',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                {selected && (
                  <CheckCircleIcon
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      fontSize: 22,
                    }}
                  />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    mb: 0.5,
                    pr: 0.5,
                  }}
                >
                  {option.optionLabel}
                </Typography>

                {option.optionValue && option.optionValue !== option.optionLabel && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      pr: 0.5,
                    }}
                  >
                    {option.optionValue}
                  </Typography>
                )}

                {option.priceModifier > 0 && (
                  <Typography
                    variant="caption"
                    color="primary.main"
                    sx={{
                      display: 'block',
                      mt: 0.75,
                    }}
                  >
                    +₪{option.priceModifier}
                    {option.isPerUnit ? ' לעותק' : ' חד-פעמי'}
                  </Typography>
                )}
              </ButtonBase>
            );
          })}
        </Box>

        {!isValid && <FormHelperText>יש לבחור אפשרות</FormHelperText>}
      </FormControl>
    );
  }

  return (
    <FormControl fullWidth required={isRequired} error={!isValid} size="small">
      <Typography
        variant="body2"
        sx={{
          textAlign: 'left',
          mb: 0.75,
          fontWeight: 500,
        }}
      >
        {attributeName}
        {isRequired ? ' *' : ''}
      </Typography>

      <Select
        value={selectedOptionId}
        displayEmpty
        onChange={(event) => handleChange(event.target.value)}
        sx={{
          direction: 'ltr',
          height: 40,
        }}
      >
        <MenuItem value="" disabled={isRequired}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              direction: 'ltr',
            }}
          >
            {isRequired ? 'בחר אפשרות' : 'ללא בחירה'}
          </Typography>
        </MenuItem>

        {sortedOptions.map((option) => (
          <MenuItem
            key={option.id}
            value={option.id}
            sx={{
              direction: 'ltr',
            }}
          >
            {option.optionLabel}
          </MenuItem>
        ))}
      </Select>

      {!isValid && <FormHelperText>יש לבחור אפשרות</FormHelperText>}
    </FormControl>
  );
}
