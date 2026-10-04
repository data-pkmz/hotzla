import React from 'react';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { Box, FormControlLabel, IconButton, MenuItem, Switch, TextField } from '@mui/material';
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
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: {
        xs: '1fr',
        sm: 'minmax(0, 1fr) minmax(0, 1fr)',
        md: `
          minmax(0, 1.55fr)
          minmax(0, 1fr)
          minmax(0, 1.15fr)
          minmax(0, 1.15fr)
          auto
          auto
        `,
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
      sx={{ minWidth: 0 }}
      onChange={(event) => {
        const optionLabel = event.target.value;

        const patch: Partial<BuilderOption> = {
          optionLabel,
        };

        if (!option.optionValue || option.optionValue === option.optionLabel) {
          patch.optionValue = optionLabel;
        }

        onChange(patch);
      }}
    />

    <TextField
      fullWidth
      size="small"
      label="ערך מזהה"
      placeholder="chromo_300"
      value={option.optionValue}
      InputLabelProps={{
        shrink: true,
      }}
      sx={{
        minWidth: 0,
        '& .MuiInputLabel-root': {
          maxWidth: 'none',
          overflow: 'visible',
          textOverflow: 'clip',
          whiteSpace: 'nowrap',
        },
      }}
      onChange={(event) =>
        onChange({
          optionValue: event.target.value,
        })
      }
    />

    <TextField
      fullWidth
      size="small"
      label="תוספת מחיר"
      type="number"
      inputProps={{
        min: 0,
        step: '0.1',
      }}
      InputLabelProps={{
        shrink: true,
      }}
      value={option.priceModifier}
      error={Number(option.priceModifier) < 0}
      helperText={
        Number(option.priceModifier) < 0 ? 'תוספת המחיר לא יכולה להיות שלילית' : undefined
      }
      sx={{
        minWidth: 0,
        '& .MuiInputLabel-root': {
          maxWidth: 'none',
          overflow: 'visible',
          textOverflow: 'clip',
          whiteSpace: 'nowrap',
        },
      }}
      onChange={(event) =>
        onChange({
          priceModifier: Number(event.target.value),
        })
      }
    />

    <TextField
      fullWidth
      select
      size="small"
      label="סוג תוספת"
      value={option.priceModifierType}
      InputLabelProps={{
        shrink: true,
      }}
      sx={{
        minWidth: 0,
        '& .MuiInputLabel-root': {
          maxWidth: 'none',
          overflow: 'visible',
          textOverflow: 'clip',
          whiteSpace: 'nowrap',
        },
      }}
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
          onChange={(event) =>
            onChange({
              isPerUnit: event.target.checked,
            })
          }
        />
      }
      label="ליחידה"
      sx={{
        m: 0,
        whiteSpace: 'nowrap',
      }}
    />

    <IconButton aria-label="הסר אפשרות" color="error" size="small" onClick={onRemove}>
      <DeleteOutlineRoundedIcon />
    </IconButton>
  </Box>
);
