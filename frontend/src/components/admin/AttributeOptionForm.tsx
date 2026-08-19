import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { Box, IconButton, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import type { BuilderOption } from '../../pages/admin/ProductBuilderPage';

interface AttributeOptionFormProps {
  option: BuilderOption;
  onChange: (patch: Partial<BuilderOption>) => void;
  onRemove: () => void;
}

export const AttributeOptionForm = ({ option, onChange, onRemove }: AttributeOptionFormProps) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1.4fr 1.2fr 0.8fr 0.8fr auto' }, gap: 1, alignItems: 'center', p: 1.25, bgcolor: 'surface.containerLow', borderRadius: 1 }}>
    <TextField size="small" label="תווית" value={option.optionLabel} onChange={(event) => onChange({ optionLabel: event.target.value })} />
    <TextField size="small" label="ערך" value={option.optionValue} onChange={(event) => onChange({ optionValue: event.target.value })} />
    <TextField size="small" label="תוספת" type="number" value={option.priceModifier} onChange={(event) => onChange({ priceModifier: Number(event.target.value) })} />
    <TextField select size="small" label="סוג" value={option.priceModifierType} SelectProps={{ native: true }} onChange={(event) => onChange({ priceModifierType: event.target.value as BuilderOption['priceModifierType'] })}>
      <option value="FIXED_ADD">תוספת קבועה</option><option value="MULTIPLY">מכפיל</option>
    </TextField>
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Tooltip title="תמחור לפי יחידה"><Typography variant="caption">ליחידה</Typography></Tooltip><Switch size="small" checked={option.isPerUnit} onChange={(event) => onChange({ isPerUnit: event.target.checked })} />
      <IconButton aria-label="הסר אפשרות" color="error" onClick={onRemove}><DeleteOutlineRoundedIcon /></IconButton>
    </Stack>
  </Box>
);