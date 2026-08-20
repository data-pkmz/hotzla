import { useEffect, useMemo, useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';

import type { ProductAttributeDefinition, SelectedAttributeInput } from 'shared-types';

import DynamicAttributeInput from './DynamicAttributeInput';

interface AttributeFormValue {
  quantity: number;
  selectedAttributes: SelectedAttributeInput[];
}

interface AttributeFormProps {
  attributeDefinitions: ProductAttributeDefinition[];
  onChange?: (value: AttributeFormValue, isValid: boolean) => void;
}

interface AttributeFormState {
  quantity: number;
  selectedAttributes: SelectedAttributeInput[];
  validation: Record<string, boolean>;
}

const getAttributeGridSpan = (attribute: ProductAttributeDefinition): number => {
  if (attribute.attributeType === 'FILE_UPLOAD') {
    return 12;
  }

  if (attribute.displayStyle === 'CARDS') {
    return 12;
  }

  if (attribute.displayStyle === 'MULTI_LINE') {
    return 12;
  }

  return 6;
};

export default function AttributeForm({ attributeDefinitions, onChange }: AttributeFormProps) {
  const [formState, setFormState] = useState<AttributeFormState>({
    quantity: 1,
    selectedAttributes: [],
    validation: {},
  });

  const sortedAttributes = useMemo(
    () => [...attributeDefinitions].sort((a, b) => a.displayOrder - b.displayOrder),
    [attributeDefinitions]
  );

  const formIsValid = useMemo(() => {
    const quantityIsValid = Number.isInteger(formState.quantity) && formState.quantity > 0;

    const attributesAreValid = sortedAttributes.every((attribute) => {
      if (!attribute.isRequired) {
        return formState.validation[attribute.id] !== false;
      }

      return formState.validation[attribute.id] === true;
    });

    return quantityIsValid && attributesAreValid;
  }, [formState.quantity, formState.validation, sortedAttributes]);

  useEffect(() => {
    onChange?.(
      {
        quantity: formState.quantity,
        selectedAttributes: formState.selectedAttributes,
      },
      formIsValid
    );
  }, [formState.quantity, formState.selectedAttributes, formIsValid, onChange]);

  const handleQuantityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const quantity = Number(event.target.value);

    setFormState((current) => ({
      ...current,
      quantity,
    }));
  };

  const handleAttributeChange = (changedAttribute: SelectedAttributeInput, isValid: boolean) => {
    const attributeId = changedAttribute.attributeDefinitionId;

    setFormState((current) => {
      const existingIndex = current.selectedAttributes.findIndex(
        (attribute) => attribute.attributeDefinitionId === attributeId
      );

      let updatedAttributes: SelectedAttributeInput[];

      if (existingIndex === -1) {
        updatedAttributes = [...current.selectedAttributes, changedAttribute];
      } else {
        updatedAttributes = [...current.selectedAttributes];

        updatedAttributes[existingIndex] = changedAttribute;
      }

      return {
        ...current,
        selectedAttributes: updatedAttributes,
        validation: {
          ...current.validation,
          [attributeId]: isValid,
        },
      };
    });
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 3,
        direction: 'ltr',
        width: '100%',
      }}
    >
      <Box
        sx={{
          gridColumn: {
            xs: 'span 12',
            md: 'span 6',
          },
          minWidth: 0,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            direction: 'ltr',
            textAlign: 'left',
            mb: 0.75,
            fontWeight: 500,
          }}
        >
          כמות
        </Typography>

        <TextField
          fullWidth
          type="number"
          size="small"
          value={formState.quantity}
          inputProps={{
            min: 1,
            step: 1,
          }}
          error={!Number.isInteger(formState.quantity) || formState.quantity <= 0}
          helperText={
            !Number.isInteger(formState.quantity) || formState.quantity <= 0
              ? 'הכמות חייבת להיות מספר שלם וחיובי'
              : undefined
          }
          onChange={handleQuantityChange}
          sx={{
            direction: 'ltr',

            '& .MuiOutlinedInput-root': {
              height: 40,
            },

            '& fieldset': {
              borderColor: 'primary.main',
            },

            '&:hover fieldset': {
              borderColor: 'primary.main',
            },

            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            },

            '& input': {
              textAlign: 'left',
            },
          }}
        />
      </Box>

      {sortedAttributes.map((attribute) => {
        const gridSpan = getAttributeGridSpan(attribute);

        const value = formState.selectedAttributes.find(
          (selected) => selected.attributeDefinitionId === attribute.id
        );

        return (
          <Box
            key={attribute.id}
            sx={{
              gridColumn: {
                xs: 'span 12',
                md: `span ${gridSpan}`,
              },
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',

              '& > *': {
                flex: 1,
                minWidth: 0,
              },
            }}
          >
            <DynamicAttributeInput
              attributeDefinition={attribute}
              value={value}
              onChange={handleAttributeChange}
            />
          </Box>
        );
      })}
    </Box>
  );
}
