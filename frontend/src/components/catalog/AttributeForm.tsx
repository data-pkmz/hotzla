import { useMemo, useState } from 'react';
import { Box } from '@mui/material';

import type { ProductAttributeDefinition, SelectedAttributeInput } from 'shared-types';

import DynamicAttributeInput from './dynamicAttributeInput';

interface AttributeFormProps {
  attributeDefinitions: ProductAttributeDefinition[];
  onChange?: (selectedAttributes: SelectedAttributeInput[], isValid: boolean) => void;
}

interface AttributeFormState {
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
    selectedAttributes: [],
    validation: {},
  });

  const sortedAttributes = useMemo(
    () => [...attributeDefinitions].sort((a, b) => a.displayOrder - b.displayOrder),
    [attributeDefinitions]
  );

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

      const updatedValidation = {
        ...current.validation,
        [attributeId]: isValid,
      };

      const formIsValid = sortedAttributes.every((attribute) => {
        if (!attribute.isRequired) {
          return updatedValidation[attribute.id] !== false;
        }

        return updatedValidation[attribute.id] === true;
      });

      onChange?.(updatedAttributes, formIsValid);

      return {
        selectedAttributes: updatedAttributes,
        validation: updatedValidation,
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
