import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';

import type { ProductAttributeDefinition, SelectedAttributeInput } from 'shared-types';

import DynamicAttributeInput from './dynamicAttributeInput';

const mockAttributes: ProductAttributeDefinition[] = [
  {
    id: 'paper-size',
    productId: 'test-product',
    attributeName: 'גודל נייר',
    attributeType: 'SELECT',
    isRequired: true,
    displayOrder: 1,
    pricingRule: 'FLAT_ADD_PER_OPTION',
    unitPrice: null,
    minValue: null,
    maxValue: null,
    options: [
      {
        id: 'a4',
        attributeDefinitionId: 'paper-size',
        optionLabel: 'A4',
        optionValue: 'A4',
        priceModifier: 0,
        priceModifierType: 'FIXED_ADD',
        isPerUnit: false,
        displayOrder: 1,
      },
      {
        id: 'a3',
        attributeDefinitionId: 'paper-size',
        optionLabel: 'A3',
        optionValue: 'A3',
        priceModifier: 5,
        priceModifierType: 'FIXED_ADD',
        isPerUnit: false,
        displayOrder: 2,
      },
      {
        id: 'a2',
        attributeDefinitionId: 'paper-size',
        optionLabel: 'A2',
        optionValue: 'A2',
        priceModifier: 10,
        priceModifierType: 'FIXED_ADD',
        isPerUnit: false,
        displayOrder: 3,
      },
    ],
  },
  {
    id: 'copies',
    productId: 'test-product',
    attributeName: 'מספר עותקים',
    attributeType: 'NUMBER',
    isRequired: true,
    displayOrder: 2,
    pricingRule: 'PER_UNIT_MULTIPLIER',
    unitPrice: 2,
    minValue: 1,
    maxValue: 100,
  },
  {
    id: 'lamination',
    productId: 'test-product',
    attributeName: 'למינציה',
    attributeType: 'BOOLEAN',
    isRequired: false,
    displayOrder: 3,
    pricingRule: 'NONE',
    unitPrice: 5,
    minValue: null,
    maxValue: null,
  },
  {
    id: 'custom-text',
    productId: 'test-product',
    attributeName: 'טקסט מותאם אישית',
    attributeType: 'TEXT',
    isRequired: true,
    displayOrder: 4,
    pricingRule: 'NONE',
    unitPrice: null,
    minValue: null,
    maxValue: null,
  },
  {
    id: 'artwork',
    productId: 'test-product',
    attributeName: 'קובץ להדפסה',
    attributeType: 'FILE_UPLOAD',
    isRequired: true,
    displayOrder: 5,
    pricingRule: 'NONE',
    unitPrice: null,
    minValue: null,
    maxValue: null,
  },
];

export default function DynamicAttributeInputTest() {
  const [selectedAttributes, setSelectedAttributes] = useState<SelectedAttributeInput[]>([]);

  const handleChange = (changedAttribute: SelectedAttributeInput) => {
    setSelectedAttributes((current) => {
      const index = current.findIndex(
        (attribute) => attribute.attributeDefinitionId === changedAttribute.attributeDefinitionId
      );

      if (index === -1) {
        return [...current, changedAttribute];
      }

      const updated = [...current];
      updated[index] = changedAttribute;

      return updated;
    });
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 4 }}>
      <Typography variant="h4" gutterBottom>
        בדיקת מאפייני מוצר
      </Typography>

      <Stack spacing={3}>
        {mockAttributes
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((attribute) => (
            <DynamicAttributeInput
              key={attribute.id}
              attributeDefinition={attribute}
              value={selectedAttributes.find(
                (selected) => selected.attributeDefinitionId === attribute.id
              )}
              onChange={handleChange}
            />
          ))}
      </Stack>

      <Typography variant="h6" sx={{ mt: 4 }}>
        Current values
      </Typography>

      <pre>{JSON.stringify(selectedAttributes, null, 2)}</pre>
    </Box>
  );
}
