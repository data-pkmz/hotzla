import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useState } from 'react';
import {
  Button,
  Box,
  Checkbox,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Radio,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { BuilderOption } from '../../pages/admin/ProductBuilderPage';

interface PreviewAttribute {
  id: string;
  attributeName: string;
  attributeType: string;
  isRequired: boolean;
  minValue: number | null;
  maxValue: number | null;
  options: BuilderOption[];
  selectionMode?: 'DROPDOWN' | 'FLAT' | 'MULTI' | null;
  maxLength?: number | null;
  allowedFileTypes?: 'IMAGE' | 'PDF' | 'IMAGE_AND_PDF' | null;
  allowMultipleFiles?: boolean;
  isMultipleSelection?: boolean;
}
interface PreviewProduct {
  name: string;
  description: string;
  category: string;
  imageUrl?: string | null;
}
interface ProductPreviewModalProps {
  product: PreviewProduct;
  attributes: PreviewAttribute[];
  price: number;
}

export const ProductPreviewModal = ({ product, attributes, price }: ProductPreviewModalProps) => {
  const [multiValues, setMultiValues] = useState<Record<string, string[]>>({});
  const [flatValues, setFlatValues] = useState<Record<string, string[]>>({});

  return (
  <Paper
    sx={{
      position: { xs: 'static', md: 'sticky' },
      top: { md: 16 },
      width: '100%',
      maxHeight: { md: 'calc(100vh - 112px)' },
      overflowY: { md: 'auto' },
      zIndex: 2,
      p: { xs: 2, md: 2.5 },
      border: '1px solid',
      borderTop: '4px solid',
      borderColor: 'divider',
      borderTopColor: 'secondary.main',
      bgcolor: '#f7f9fd',
      boxShadow: '0 10px 28px rgba(9,35,64,.08)',
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <VisibilityOutlinedIcon color="secondary" />
        <Typography variant="h6">תצוגה מקדימה</Typography>
      </Stack>
      <Chip label="תצוגת לקוח" size="small" color="secondary" variant="outlined" />
    </Stack>
    <Divider sx={{ mb: 2 }} />
    <Paper
      sx={{
        p: { xs: 2, md: 2.5 },
        bgcolor: 'background.paper',
        boxShadow: '0 4px 14px rgba(9,35,64,.06)',
      }}
    >
      <Typography variant="overline" color="secondary">
        {product.category || 'קטגוריה'}
      </Typography>
      <Typography variant="h5" sx={{ mt: 0.5 }}>
        {product.name || 'שם המוצר'}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {product.description || 'תיאור המוצר שיוצג למזמין'}
      </Typography>
      {product.imageUrl && <Box component="img" src={product.imageUrl} alt={product.name || 'תמונת המוצר'} sx={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 1, mb: 2 }} />}
      <Stack gap={1.5}>
        {attributes.map((attribute) =>
          attribute.attributeType === 'SELECT' && attribute.selectionMode === 'FLAT' ? (
            <Stack key={`${attribute.id}-flat`} gap={0.75}>
              <Typography variant="body2" fontWeight={600}>{attribute.attributeName}</Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {attribute.options.map((option) => {
                  const selectedValues = flatValues[attribute.id] ?? [];
                  const isSelected = selectedValues.includes(option.optionValue);
                  return <Button
                    key={option.id}
                    size="small"
                    variant={isSelected ? 'contained' : 'outlined'}
                    color={isSelected ? 'secondary' : 'primary'}
                    onClick={() => setFlatValues({
                      ...flatValues,
                      [attribute.id]: attribute.isMultipleSelection
                        ? isSelected
                          ? selectedValues.filter((value) => value !== option.optionValue)
                          : [...selectedValues, option.optionValue]
                        : [option.optionValue],
                    })}
                  >{option.optionLabel}</Button>;
                })}
              </Stack>
            </Stack>
          ) : attribute.attributeType === 'SELECT' && attribute.selectionMode !== 'FLAT' && attribute.isMultipleSelection ? (
            <TextField
              key={`${attribute.id}-multi-dropdown`}
              select
              fullWidth
              size="small"
              label={`${attribute.attributeName}${attribute.isRequired ? ' *' : ''}`}
              value={Array.isArray(multiValues[attribute.id]) ? multiValues[attribute.id] : []}
              onChange={(event) => {
                const nextValue = event.target.value;
                setMultiValues({ ...multiValues, [attribute.id]: Array.isArray(nextValue) ? nextValue : [nextValue] });
              }}
              SelectProps={{
                multiple: true,
                renderValue: (selected) => (Array.isArray(selected) ? selected : [selected]).map((value) => attribute.options.find((option) => option.optionValue === value)?.optionLabel ?? value).join(', '),
              }}
            >
              {attribute.options.map((option) => <MenuItem key={option.id} value={option.optionValue}><Checkbox size="small" checked={(multiValues[attribute.id] ?? []).includes(option.optionValue)} />{option.optionLabel}</MenuItem>)}
            </TextField>
          ) : attribute.attributeType === 'SELECT' && attribute.selectionMode === 'MULTI' ? (
            <Stack key={`${attribute.id}-multi-flat`} gap={0.25}>
              <Typography variant="body2" fontWeight={600}>{attribute.attributeName}</Typography>
              {attribute.options.map((option) => <FormControlLabel key={option.id} control={<Checkbox size="small" />} label={option.optionLabel} />)}
            </Stack>
          ) : attribute.attributeType === 'SELECT' ? (
            <TextField key={`${attribute.id}-dropdown`} select fullWidth size="small" label={`${attribute.attributeName}${attribute.isRequired ? ' *' : ''}`} defaultValue="">
              <MenuItem value="">בחירה</MenuItem>
              {attribute.options.map((option) => <MenuItem key={option.id} value={option.optionValue}>{option.optionLabel}</MenuItem>)}
            </TextField>
          ) : attribute.attributeType === 'BOOLEAN' ? (
            <Stack key={attribute.id} direction="row" alignItems="center" gap={1}>
              <Radio size="small" />
              <Typography>{attribute.attributeName || 'כן / לא'}</Typography>
            </Stack>
          ) : attribute.attributeType === 'FILE_UPLOAD' ? (
            <Button key={attribute.id} variant="outlined" component="label" startIcon={<VisibilityOutlinedIcon />}>
              העלאת {attribute.allowedFileTypes === 'PDF' ? 'PDF' : attribute.allowedFileTypes === 'IMAGE' ? 'תמונה' : 'קובץ'}{attribute.allowMultipleFiles ? 'ים' : ''}
              <input hidden type="file" multiple={attribute.allowMultipleFiles} accept={attribute.allowedFileTypes === 'PDF' ? '.pdf' : attribute.allowedFileTypes === 'IMAGE' ? 'image/*' : 'image/*,.pdf'} />
            </Button>
          ) : (
            <TextField
              key={attribute.id}
              fullWidth
              size="small"
              label={`${attribute.attributeName}${attribute.isRequired ? ' *' : ''}`}
              type={attribute.attributeType === 'NUMBER' ? 'number' : 'text'}
              inputProps={{
                min: attribute.minValue ?? undefined,
                max: attribute.maxValue ?? undefined,
                maxLength: attribute.maxLength ?? undefined,
              }}
            />
          )
        )}
      </Stack>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
        sx={{ mt: 2.5, mb: 1.5 }}
      >
        <Typography variant="body2" color="text.secondary">
          מחיר בסיס
        </Typography>
        <Typography variant="h5" color="secondary">
          ₪{price.toFixed(2)}
        </Typography>
      </Stack>
      <Button fullWidth variant="contained" disabled startIcon={<ShoppingBagOutlinedIcon />}>
        הוסף לעגלה
      </Button>
    </Paper>
  </Paper>
  );
};
