import React from 'react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import {
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { AttributeDisplayStyle, PricingImpactType } from 'shared-types';
import type { BuilderAttribute, BuilderOption } from '../../pages/admin/ProductBuilderPage';
import { AttributeOptionForm } from './AttributeOptionForm';

interface AttributeDefinitionFormProps {
  attribute: BuilderAttribute;
  onChange: (patch: Partial<BuilderAttribute>) => void;
}

export const AttributeDefinitionForm: React.FC<AttributeDefinitionFormProps> = ({
  attribute,
  onChange,
}) => {
  const updateOption = (optionId: string, patch: Partial<BuilderOption>) => {
    onChange({
      options: (attribute.options || []).map((option) =>
        option.id === optionId ? { ...option, ...patch } : option
      ),
    });
  };

  const addOption = () => {
    const currentOptions = attribute.options || [];
    const newOption: BuilderOption = {
      id: crypto.randomUUID(),
      optionLabel: '',
      optionValue: '',
      priceModifier: 0,
      priceModifierType: 'FIXED_ADD',
      displayOrder: currentOptions.length,
      isPerUnit: false,
    };
    onChange({ options: [...currentOptions, newOption] });
  };

  const removeOption = (optionId: string) => {
    onChange({
      options: (attribute.options || []).filter((opt) => opt.id !== optionId),
    });
  };

  return (
    <Stack gap={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
        <TextField
          fullWidth
          size="small"
          label="שם המאפיין"
          placeholder="לדוגמה: סוג נייר, גודל, כריכה..."
          value={attribute.attributeName}
          onChange={(event) => onChange({ attributeName: event.target.value })}
        />
        <TextField
          fullWidth
          select
          size="small"
          label="כלל תמחור"
          value={attribute.pricingRule}
          onChange={(event) => onChange({ pricingRule: event.target.value as PricingImpactType })}
        >
          <MenuItem value="NONE">ללא תמחור נוסף</MenuItem>
          <MenuItem value="FLAT_ADD_PER_OPTION">תוספת לפי בחירה</MenuItem>
          <MenuItem value="PER_UNIT_MULTIPLIER">מכפיל לפי יחידה</MenuItem>
        </TextField>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'center' }}>
        <FormControlLabel
          control={
            <Switch
              checked={attribute.isRequired}
              onChange={(event) => onChange({ isRequired: event.target.checked })}
            />
          }
          label="שדה חובה"
        />

        {attribute.attributeType === 'SELECT' && (
          <TextField
            select
            size="small"
            label="סגנון תצוגה"
            value={attribute.displayStyle === 'CARDS' ? 'CARDS' : 'DROPDOWN'}
            onChange={(event) =>
              onChange({ displayStyle: event.target.value as AttributeDisplayStyle })
            }
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="DROPDOWN">תפריט נפתח (Dropdown)</MenuItem>
            <MenuItem value="CARDS">כרטיסיות בחירה (Cards)</MenuItem>
          </TextField>
        )}

        {attribute.attributeType === 'BOOLEAN' && (
          <TextField
            select
            size="small"
            label="סגנון תצוגה"
            value={attribute.displayStyle === 'CHECKBOX' ? 'CHECKBOX' : 'SWITCH'}
            onChange={(event) =>
              onChange({ displayStyle: event.target.value as AttributeDisplayStyle })
            }
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="SWITCH">מתג הפעלה (Switch)</MenuItem>
            <MenuItem value="CHECKBOX">תיבת סימון (Checkbox)</MenuItem>
          </TextField>
        )}

        {attribute.attributeType === 'TEXT' && (
          <TextField
            select
            size="small"
            label="סגנון תצוגה"
            value={attribute.displayStyle === 'MULTI_LINE' ? 'MULTI_LINE' : 'SINGLE_LINE'}
            onChange={(event) =>
              onChange({ displayStyle: event.target.value as AttributeDisplayStyle })
            }
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="SINGLE_LINE">שורה אחת (Single Line)</MenuItem>
            <MenuItem value="MULTI_LINE">תיבת טקסט מרובת שורות</MenuItem>
          </TextField>
        )}

        {attribute.attributeType === 'NUMBER' && (
          <Stack direction="row" gap={1}>
            <TextField
              size="small"
              label="ערך מינימלי"
              type="number"
              value={attribute.minValue ?? ''}
              onChange={(event) =>
                onChange({
                  minValue: event.target.value === '' ? null : Number(event.target.value),
                })
              }
            />
            <TextField
              size="small"
              label="ערך מקסימלי"
              type="number"
              value={attribute.maxValue ?? ''}
              onChange={(event) =>
                onChange({
                  maxValue: event.target.value === '' ? null : Number(event.target.value),
                })
              }
            />
            {attribute.pricingRule === 'PER_UNIT_MULTIPLIER' && (
              <TextField
                size="small"
                label="מחיר ליחידה (₪)"
                type="number"
                inputProps={{ step: '0.01' }}
                value={attribute.unitPrice ?? ''}
                onChange={(event) =>
                  onChange({
                    unitPrice: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
              />
            )}
          </Stack>
        )}
      </Stack>

      {attribute.attributeType === 'SELECT' && (
        <Stack gap={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={600}>
              אפשרויות בחירה ({attribute.options.length})
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={addOption}
            >
              הוסף אפשרות
            </Button>
          </Stack>

          {attribute.options.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 1 }}>
              עדיין לא הוגדרו אפשרויות בחירה. לחץ על "הוסף אפשרות" כדי להגדיר.
            </Typography>
          ) : (
            attribute.options.map((option) => (
              <AttributeOptionForm
                key={option.id}
                option={option}
                onChange={(patch) => updateOption(option.id, patch)}
                onRemove={() => removeOption(option.id)}
              />
            ))
          )}
        </Stack>
      )}
    </Stack>
  );
};
