import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { Autocomplete, Button, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import type { BuilderOption } from '../../pages/admin/ProductBuilderPage';
import { AttributeOptionForm } from './AttributeOptionForm';

const pricingRules = ['NONE', 'FLAT_ADD_PER_OPTION', 'PER_UNIT_MULTIPLIER'] as const;
type AttributeType = 'SELECT' | 'NUMBER' | 'BOOLEAN' | 'TEXT' | 'FILE_UPLOAD';

export interface BuilderAttributeForm {
  id: string;
  attributeName: string;
  attributeType: AttributeType;
  isRequired: boolean;
  pricingRule: (typeof pricingRules)[number];
  unitPrice: number | null;
  minValue: number | null;
  maxValue: number | null;
  selectionMode?: 'DROPDOWN' | 'FLAT' | 'MULTI' | null;
  isMultipleSelection?: boolean;
  maxLength?: number | null;
  allowedFileTypes?: 'IMAGE' | 'PDF' | 'IMAGE_AND_PDF' | null;
  allowMultipleFiles?: boolean;
  options: BuilderOption[];
}

interface AttributeDefinitionFormProps { attribute: BuilderAttributeForm; onChange: (patch: Partial<BuilderAttributeForm>) => void; }

export const AttributeDefinitionForm = ({ attribute, onChange }: AttributeDefinitionFormProps) => {
  const updateOption = (optionId: string, patch: Partial<BuilderOption>) => onChange({ options: attribute.options.map((option) => option.id === optionId ? { ...option, ...patch } : option) });
  const addOption = () => onChange({ options: [...attribute.options, { id: crypto.randomUUID(), optionLabel: '', optionValue: '', priceModifier: 0, priceModifierType: 'FIXED_ADD', displayOrder: attribute.options.length, isPerUnit: false }] });
  const optionValues = attribute.options.map((option) => option.optionLabel).filter(Boolean);
  const updateMultipleOptions = (values: string[]) => onChange({
    options: values.map((value, index) => {
      const existing = attribute.options.find((option) => option.optionLabel === value);
      return existing ?? { id: crypto.randomUUID(), optionLabel: value, optionValue: value, priceModifier: 0, priceModifierType: 'FIXED_ADD', displayOrder: index, isPerUnit: false };
    }),
  });
  return (
    <Stack gap={1.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
        <TextField fullWidth size="small" label="שם המאפיין" value={attribute.attributeName} onChange={(event) => onChange({ attributeName: event.target.value })} />
        <TextField fullWidth select size="small" label="כלל תמחור" value={attribute.pricingRule} onChange={(event) => onChange({ pricingRule: event.target.value as BuilderAttributeForm['pricingRule'] })}>
          <MenuItem value={pricingRules[0]}>ללא תמחור נוסף</MenuItem><MenuItem value={pricingRules[1]}>תוספת לפי בחירה</MenuItem><MenuItem value={pricingRules[2]}>מכפיל לפי יחידה</MenuItem>
        </TextField>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'center' }}>
        <FormControlLabel control={<Switch checked={attribute.isRequired} onChange={(event) => onChange({ isRequired: event.target.checked })} />} label="שדה חובה" />
        {attribute.attributeType === 'SELECT' && <>
          <TextField select size="small" label="תצוגת אפשרויות" value={attribute.selectionMode === 'FLAT' ? 'FLAT' : 'DROPDOWN'} onChange={(event) => onChange({ selectionMode: event.target.value as 'DROPDOWN' | 'FLAT' })}>
            <MenuItem value="DROPDOWN">תפריט נפתח</MenuItem><MenuItem value="FLAT">תפריט שטוח</MenuItem>
          </TextField>
          <FormControlLabel control={<Switch checked={attribute.isMultipleSelection ?? attribute.selectionMode === 'MULTI'} onChange={(event) => onChange({ isMultipleSelection: event.target.checked })} />} label="בחירה מרובה" />
        </>}
        {attribute.attributeType === 'NUMBER' && <><TextField size="small" label="מינימום" type="number" value={attribute.minValue ?? ''} onChange={(event) => onChange({ minValue: event.target.value === '' ? null : Number(event.target.value) })} /><TextField size="small" label="מקסימום" type="number" value={attribute.maxValue ?? ''} onChange={(event) => onChange({ maxValue: event.target.value === '' ? null : Number(event.target.value) })} /></>}
        {attribute.attributeType === 'TEXT' && <TextField size="small" label="מקסימום תווים" type="number" inputProps={{ min: 1 }} value={attribute.maxLength ?? ''} onChange={(event) => onChange({ maxLength: event.target.value === '' ? null : Number(event.target.value) })} />}
        {attribute.attributeType === 'FILE_UPLOAD' && <>
          <TextField select size="small" label="סוגי קבצים" value={attribute.allowedFileTypes ?? 'IMAGE_AND_PDF'} onChange={(event) => onChange({ allowedFileTypes: event.target.value as BuilderAttributeForm['allowedFileTypes'] })}>
          <MenuItem value="IMAGE">תמונה בלבד (JPG)</MenuItem><MenuItem value="PDF">PDF בלבד</MenuItem><MenuItem value="IMAGE_AND_PDF">תמונה או PDF</MenuItem>
          </TextField>
          <FormControlLabel control={<Switch checked={attribute.allowMultipleFiles ?? false} onChange={(event) => onChange({ allowMultipleFiles: event.target.checked })} />} label="אפשר להעלות כמה קבצים" />
        </>}
      </Stack>
      {attribute.attributeType === 'SELECT' && <Stack gap={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">אפשרויות בחירה</Typography>
          {attribute.isMultipleSelection || attribute.selectionMode === 'MULTI' ? <Autocomplete
            multiple
            freeSolo
            options={optionValues}
            value={optionValues}
            onChange={(_event, values) => updateMultipleOptions(values)}
            renderInput={(params) => <TextField {...params} size="small" label="אפשרויות בחירה" placeholder="הקלד ולחץ Enter" />}
            sx={{ minWidth: { xs: 220, md: 340 } }}
          /> : <Button size="small" startIcon={<AddRoundedIcon />} onClick={addOption}>הוסף אפשרות</Button>}
        </Stack>
        {attribute.options.map((option) => <AttributeOptionForm key={option.id} option={option} onChange={(patch) => updateOption(option.id, patch)} onRemove={() => onChange({ options: attribute.options.filter((item) => item.id !== option.id) })} />)}
      </Stack>}
    </Stack>
  );
};