import { useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';

import type { ProductAttributeDefinition, SelectedAttributeInput } from 'shared-types';

interface NumberAttributeInputProps {
  attributeDefinition: ProductAttributeDefinition;
  value?: SelectedAttributeInput;
  onChange: (value: SelectedAttributeInput, isValid: boolean) => void;
}

const formatPrice = (price: number): string => `₪${price.toFixed(2)}`;

export default function NumberAttributeInput({
  attributeDefinition,
  value,
  onChange,
}: NumberAttributeInputProps) {
  const { id, attributeName, isRequired, minValue, maxValue, pricingRule, unitPrice } =
    attributeDefinition;

  const [inputValue, setInputValue] = useState(
    typeof value?.value === 'number' ? String(value.value) : ''
  );

  /**
   * Validates the entered numeric value against the attribute's
   * required status and configured minimum/maximum limits.
   */
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

  /**
   * NUMBER attributes are priced according to the entered value.
   *
   * Example:
   * - Entered value: 5
   * - Price per value unit: ₪4
   * - Additional cost: 5 × 4 = ₪20
   *
   * The ordered product quantity is not multiplied here.
   */
  const pricePerValue = Number(unitPrice ?? 0);

  const hasAdditionalPrice =
    pricingRule === 'PER_UNIT_MULTIPLIER' && Number.isFinite(pricePerValue) && pricePerValue > 0;

  const enteredNumber = inputValue.trim() !== '' ? Number(inputValue) : null;

  const showCalculatedPrice =
    hasAdditionalPrice &&
    validation.isValid &&
    enteredNumber !== null &&
    Number.isFinite(enteredNumber);

  const additionalPrice = showCalculatedPrice ? enteredNumber * pricePerValue : null;

  return (
    <Box
      sx={{
        direction: 'ltr',
        textAlign: 'left',
        width: '100%',
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

          // Hide browser number-input spinner arrows.
          '& input[type=number]': {
            MozAppearance: 'textfield',
          },

          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button':
            {
              WebkitAppearance: 'none',
              margin: 0,
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

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: 'block',
          mt: 0.75,
        }}
      >
        {hasAdditionalPrice
          ? `תוספת ${formatPrice(pricePerValue)} לכל יחידת ערך`
          : 'ללא תוספת תשלום'}
      </Typography>

      {additionalPrice !== null && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.25,
            fontWeight: 600,
            color: 'primary.main',
          }}
        >
          {`${formatPrice(pricePerValue)} × ${enteredNumber} = ${formatPrice(additionalPrice)}`}
        </Typography>
      )}
    </Box>
  );
}
