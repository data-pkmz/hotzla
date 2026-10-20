import React from 'react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import {
  Alert,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { AttributeDisplayStyle } from 'shared-types';
import type {
  BuilderAttribute,
  BuilderOption,
} from '../../pages/admin/product-builder/ProductBuilderPage';
import { AttributeOptionForm } from './AttributeOptionForm';

interface AttributeDefinitionFormProps {
  attribute: BuilderAttribute;
  onChange: (patch: Partial<BuilderAttribute>) => void;
}

export const AttributeDefinitionForm: React.FC<AttributeDefinitionFormProps> = ({
  attribute,
  onChange,
}) => {
  const isSelect = attribute.attributeType === 'SELECT';
  const isNumber = attribute.attributeType === 'NUMBER';
  const isBoolean = attribute.attributeType === 'BOOLEAN';
  const isText = attribute.attributeType === 'TEXT';

  const minValueInvalid =
    attribute.minValue !== null &&
    attribute.minValue !== undefined &&
    (!Number.isFinite(Number(attribute.minValue)) || Number(attribute.minValue) < 0);

  const maxValueInvalid =
    attribute.maxValue !== null &&
    attribute.maxValue !== undefined &&
    (!Number.isFinite(Number(attribute.maxValue)) || Number(attribute.maxValue) < 0);

  const minMaxInvalid =
    attribute.minValue !== null &&
    attribute.minValue !== undefined &&
    attribute.maxValue !== null &&
    attribute.maxValue !== undefined &&
    Number(attribute.maxValue) < Number(attribute.minValue);

  const unitPrice = Number(attribute.unitPrice);

  const unitPriceInvalid =
    (isNumber || (isBoolean && attribute.pricingRule !== 'NONE')) &&
    (attribute.unitPrice === null ||
      attribute.unitPrice === undefined ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      (isNumber && unitPrice === 0));

  const updateOption = (optionId: string, patch: Partial<BuilderOption>) => {
    onChange({
      options: attribute.options.map((option) =>
        option.id === optionId ? { ...option, ...patch } : option
      ),
    });
  };

  const addOption = () => {
    const newOption: BuilderOption = {
      id: crypto.randomUUID(),
      optionLabel: '',
      optionValue: '',
      priceModifier: 0,
      priceModifierType: 'FIXED_ADD',
      displayOrder: attribute.options.length,
      isPerUnit: false,
    };

    onChange({
      options: [...attribute.options, newOption],
    });
  };

  const removeOption = (optionId: string) => {
    onChange({
      options: attribute.options.filter((option) => option.id !== optionId),
    });
  };

  return (
    <Stack gap={2}>
      <TextField
        fullWidth
        size="small"
        label="שם המאפיין"
        placeholder="לדוגמה: סוג נייר, גודל, כריכה..."
        value={attribute.attributeName}
        onChange={(event) => onChange({ attributeName: event.target.value })}
      />

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

        {isSelect && (
          <TextField
            select
            size="small"
            label="סגנון תצוגה"
            value={attribute.displayStyle === 'CARDS' ? 'CARDS' : 'DROPDOWN'}
            onChange={(event) =>
              onChange({ displayStyle: event.target.value as AttributeDisplayStyle })
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="DROPDOWN">תפריט נפתח</MenuItem>
            <MenuItem value="CARDS">כרטיסיות בחירה</MenuItem>
          </TextField>
        )}

        {isBoolean && (
          <TextField
            select
            size="small"
            label="סגנון תצוגה"
            value={attribute.displayStyle === 'CHECKBOX' ? 'CHECKBOX' : 'SWITCH'}
            onChange={(event) =>
              onChange({ displayStyle: event.target.value as AttributeDisplayStyle })
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="SWITCH">מתג הפעלה</MenuItem>
            <MenuItem value="CHECKBOX">תיבת סימון</MenuItem>
          </TextField>
        )}

        {isText && (
          <TextField
            select
            size="small"
            label="סגנון תצוגה"
            value={attribute.displayStyle === 'MULTI_LINE' ? 'MULTI_LINE' : 'SINGLE_LINE'}
            onChange={(event) =>
              onChange({ displayStyle: event.target.value as AttributeDisplayStyle })
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="SINGLE_LINE">שורה אחת</MenuItem>
            <MenuItem value="MULTI_LINE">מספר שורות</MenuItem>
          </TextField>
        )}
      </Stack>

      {isSelect && (
        <Stack gap={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
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

          {attribute.options.map((option) => (
            <AttributeOptionForm
              key={option.id}
              option={option}
              onChange={(patch) => updateOption(option.id, patch)}
              onRemove={() => removeOption(option.id)}
            />
          ))}

          {attribute.options.length < 2 && (
            <Typography variant="caption" color="error">
              יש להגדיר לפחות שתי אפשרויות בחירה.
            </Typography>
          )}

          <Alert severity="info">
            לכל אפשרות ניתן להגדיר תוספת מחיר חד-פעמית או תוספת לכל יחידת מוצר.
          </Alert>
        </Stack>
      )}

      {isNumber && (
        <Stack gap={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
            <TextField
              fullWidth
              size="small"
              label="ערך מינימלי"
              type="number"
              inputProps={{ min: 0 }}
              value={attribute.minValue ?? ''}
              error={minValueInvalid}
              onChange={(event) =>
                onChange({
                  minValue: event.target.value === '' ? null : Number(event.target.value),
                })
              }
            />

            <TextField
              fullWidth
              size="small"
              label="ערך מקסימלי"
              type="number"
              inputProps={{ min: 0 }}
              value={attribute.maxValue ?? ''}
              error={maxValueInvalid || minMaxInvalid}
              helperText={
                minMaxInvalid ? 'הערך המקסימלי חייב להיות גדול או שווה למינימלי' : undefined
              }
              onChange={(event) =>
                onChange({
                  maxValue: event.target.value === '' ? null : Number(event.target.value),
                })
              }
            />

            <TextField
              fullWidth
              required
              size="small"
              label="מחיר ליחידה (₪)"
              type="number"
              inputProps={{ min: 0.01, step: '0.01' }}
              value={attribute.unitPrice ?? ''}
              error={unitPriceInvalid}
              helperText={unitPriceInvalid ? 'נדרש מחיר גדול מאפס' : undefined}
              onChange={(event) =>
                onChange({
                  unitPrice: event.target.value === '' ? null : Number(event.target.value),
                })
              }
            />
          </Stack>

          <Alert severity="info">
            המחיר מחושב לפי הערך המספרי שהמזמין מזין כפול המחיר ליחידה, ומתווסף פעם אחת להזמנה.
          </Alert>
        </Stack>
      )}

      {isBoolean && (
        <Stack gap={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
            <TextField
              fullWidth
              select
              size="small"
              label="שיטת תמחור"
              value={attribute.pricingRule}
              onChange={(event) =>
                onChange({
                  pricingRule: event.target.value as BuilderAttribute['pricingRule'],
                })
              }
            >
              <MenuItem value="NONE">ללא תוספת מחיר</MenuItem>
              <MenuItem value="FLAT_ADD_PER_OPTION">תוספת חד-פעמית</MenuItem>
              <MenuItem value="PER_UNIT_MULTIPLIER">תוספת לכל יחידה</MenuItem>
            </TextField>

            {attribute.pricingRule !== 'NONE' && (
              <TextField
                fullWidth
                size="small"
                label="תוספת מחיר (₪)"
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
                value={attribute.unitPrice ?? ''}
                error={unitPriceInvalid}
                helperText={unitPriceInvalid ? 'יש להזין מחיר שאינו שלילי' : undefined}
                onChange={(event) =>
                  onChange({
                    unitPrice: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
              />
            )}
          </Stack>

          <Alert severity="info">
            כאשר האפשרות כבויה, לא מתווספת עלות. כאשר היא מופעלת, המחיר מתווסף פעם אחת או מוכפל
            בכמות המוצרים, בהתאם לשיטת התמחור. ניתן להגדיר גם תוספת מחיר של ₪0.
          </Alert>
        </Stack>
      )}

      {isText && (
        <Alert severity="info">
          מאפיין טקסט מאפשר למזמין להזין טקסט חופשי ואינו משנה את מחיר ההזמנה.
        </Alert>
      )}
    </Stack>
  );
};
