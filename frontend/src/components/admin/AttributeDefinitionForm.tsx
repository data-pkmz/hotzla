import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { Button, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import type { BuilderOption } from '../../pages/admin/ProductBuilderPage';
import { AttributeOptionForm } from './AttributeOptionForm';

const attributeTypes = ['SELECT', 'NUMBER', 'BOOLEAN', 'TEXT', 'FILE_UPLOAD'] as const;
const pricingRules = ['NONE', 'FLAT_ADD_PER_OPTION', 'PER_UNIT_MULTIPLIER'] as const;

export interface BuilderAttributeForm {
  id: string;
  attributeName: string;
  attributeType: (typeof attributeTypes)[number];
  isRequired: boolean;
  pricingRule: (typeof pricingRules)[number];
  unitPrice: number | null;
  minValue: number | null;
  maxValue: number | null;
  options: BuilderOption[];
}

interface AttributeDefinitionFormProps { attribute: BuilderAttributeForm; onChange: (patch: Partial<BuilderAttributeForm>) => void; }

export const AttributeDefinitionForm = ({ attribute, onChange }: AttributeDefinitionFormProps) => {
  const updateOption = (optionId: string, patch: Partial<BuilderOption>) => onChange({ options: attribute.options.map((option) => option.id === optionId ? { ...option, ...patch } : option) });
  return (
    <Stack gap={1.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
        <TextField fullWidth size="small" label="שם המאפיין" value={attribute.attributeName} onChange={(event) => onChange({ attributeName: event.target.value })} />
        <TextField fullWidth select size="small" label="סוג שדה" value={attribute.attributeType} onChange={(event) => onChange({ attributeType: event.target.value as BuilderAttributeForm['attributeType'], options: event.target.value === 'SELECT' ? attribute.options : [] })}>
          {attributeTypes.map((type) => <MenuItem key={type} value={type}>{type === 'SELECT' ? 'בחירה' : type === 'NUMBER' ? 'מספר' : type === 'BOOLEAN' ? 'כן / לא' : type === 'TEXT' ? 'טקסט' : 'העלאת קובץ'}</MenuItem>)}
        </TextField>
        <TextField fullWidth select size="small" label="כלל תמחור" value={attribute.pricingRule} onChange={(event) => onChange({ pricingRule: event.target.value as BuilderAttributeForm['pricingRule'] })}>
          <MenuItem value={pricingRules[0]}>ללא תמחור נוסף</MenuItem><MenuItem value={pricingRules[1]}>תוספת לפי בחירה</MenuItem><MenuItem value={pricingRules[2]}>מכפיל לפי יחידה</MenuItem>
        </TextField>
      </Stack>
      <Stack direction="row" gap={2} alignItems="center"><FormControlLabel control={<Switch checked={attribute.isRequired} onChange={(event) => onChange({ isRequired: event.target.checked })} />} label="שדה חובה" />{attribute.attributeType === 'NUMBER' && <><TextField size="small" label="מינימום" type="number" value={attribute.minValue ?? ''} onChange={(event) => onChange({ minValue: event.target.value === '' ? null : Number(event.target.value) })} /><TextField size="small" label="מקסימום" type="number" value={attribute.maxValue ?? ''} onChange={(event) => onChange({ maxValue: event.target.value === '' ? null : Number(event.target.value) })} /></>}</Stack>
      {attribute.attributeType === 'SELECT' && <Stack gap={1}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle2">אפשרויות בחירה</Typography><Button size="small" startIcon={<AddRoundedIcon />} onClick={() => onChange({ options: [...attribute.options, { id: crypto.randomUUID(), optionLabel: 'אפשרות חדשה', optionValue: 'new-option', priceModifier: 0, priceModifierType: 'FIXED_ADD', isPerUnit: false, displayOrder: attribute.options.length }] })}>הוספת אפשרות</Button></Stack>{attribute.options.map((option) => <AttributeOptionForm key={option.id} option={option} onChange={(patch) => updateOption(option.id, patch)} onRemove={() => onChange({ options: attribute.options.filter((item) => item.id !== option.id) })} />)}</Stack>}
    </Stack>
  );
};