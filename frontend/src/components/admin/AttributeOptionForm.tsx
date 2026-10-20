import React from 'react';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { Box, FormControlLabel, IconButton, Switch, TextField, Typography } from '@mui/material';
import type { BuilderOption } from '../../pages/admin/product-builder/ProductBuilderPage';

interface AttributeOptionFormProps {
  option: BuilderOption;
  onChange: (patch: Partial<BuilderOption>) => void;
  onRemove: () => void;
}

export const AttributeOptionForm: React.FC<AttributeOptionFormProps> = ({
  option,
  onChange,
  onRemove,
}) => {
  const price = Number(option.priceModifier);
  const priceInvalid = !Number.isFinite(price) || price < 0;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'minmax(0, 1.5fr) minmax(0, 1fr) auto auto',
        },
        gap: 1.5,
        alignItems: 'center',
        width: '100%',
        minWidth: 0,
        p: 1.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <TextField
        fullWidth
        size="small"
        label="תווית תצוגה"
        placeholder="לדוגמה: נייר כרומו 300 גרם"
        value={option.optionLabel}
        onChange={(event) => {
          const optionLabel = event.target.value;

          const patch: Partial<BuilderOption> = { optionLabel };

          if (!option.optionValue || option.optionValue === option.optionLabel) {
            patch.optionValue = optionLabel;
          }

          onChange(patch);
        }}
      />

      <TextField
        fullWidth
        size="small"
        label="תוספת מחיר (₪)"
        type="number"
        inputProps={{ min: 0, step: '0.01' }}
        value={option.priceModifier}
        error={priceInvalid}
        helperText={
          priceInvalid
            ? 'המחיר חייב להיות מספר שאינו שלילי'
            : option.isPerUnit
              ? 'תוספת לכל יחידת מוצר'
              : 'תוספת חד-פעמית להזמנה'
        }
        onChange={(event) =>
          onChange({
            priceModifier: Number(event.target.value),
            priceModifierType: 'FIXED_ADD',
          })
        }
      />

      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={Boolean(option.isPerUnit)}
            onChange={(event) => onChange({ isPerUnit: event.target.checked })}
          />
        }
        label="לכל יחידת מוצר"
        sx={{ m: 0, whiteSpace: 'nowrap' }}
      />

      <IconButton
        aria-label="הסר אפשרות"
        title="הסר אפשרות"
        color="error"
        size="small"
        onClick={onRemove}
      >
        <DeleteOutlineRoundedIcon />
      </IconButton>

      <Typography variant="caption" color="text.secondary" sx={{ gridColumn: '1 / -1' }}>
        {option.isPerUnit
          ? 'המחיר יוכפל בכמות המוצרים שהוזמנה.'
          : 'המחיר יתווסף פעם אחת בלבד להזמנה.'}
      </Typography>
    </Box>
  );
};
