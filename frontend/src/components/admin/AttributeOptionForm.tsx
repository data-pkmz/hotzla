import React from 'react';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { Box, FormControlLabel, IconButton, MenuItem, Switch, TextField } from '@mui/material';
import type { BuilderOption } from '../../pages/admin/ProductBuilderPage';

interface AttributeOptionFormProps {
  option: BuilderOption;
  onChange: (patch: Partial<BuilderOption>) => void;
  onRemove: () => void;
}

export const AttributeOptionForm: React.FC<AttributeOptionFormProps> = ({
  option,
  onChange,
  onRemove,
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr 1fr', md: '1.4fr 1.2fr 0.9fr 1fr auto auto' },
      gap: 1.5,
      alignItems: 'center',
      p: 1.5,
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1,
    }}
  >
    <TextField
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
      size="small"
      label="ערך מזהה"
      placeholder="chromo_300"
      value={option.optionValue}
      onChange={(event) => onChange({ optionValue: event.target.value })}
    />
    <TextField
      size="small"
      label="תוספת מחיר"
      type="number"
      inputProps={{ step: '0.1' }}
      value={option.priceModifier}
      onChange={(event) => onChange({ priceModifier: Number(event.target.value) || 0 })}
    />
    <TextField
      select
      size="small"
      label="סוג תוספת"
      value={option.priceModifierType}
      onChange={(event) =>
        onChange({
          priceModifierType: event.target.value as BuilderOption['priceModifierType'],
        })
      }
    >
      <MenuItem value="FIXED_ADD">תוספת קבועה (₪)</MenuItem>
      <MenuItem value="MULTIPLY">מכפיל (x)</MenuItem>
    </TextField>
    <FormControlLabel
      control={
        <Switch
          size="small"
          checked={Boolean(option.isPerUnit)}
          onChange={(event) => onChange({ isPerUnit: event.target.checked })}
        />
      }
      label="ליחידה"
      sx={{ m: 0 }}
    />
    <IconButton aria-label="הסר אפשרות" color="error" size="small" onClick={onRemove}>
      <DeleteOutlineRoundedIcon />
    </IconButton>
  </Box>
);
