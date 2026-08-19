import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { BuilderOption } from '../../pages/admin/ProductBuilderPage';

interface PreviewAttribute { id: string; attributeName: string; attributeType: string; isRequired: boolean; minValue: number | null; maxValue: number | null; options: BuilderOption[]; }
interface PreviewProduct { name: string; description: string; category: string; }
interface ProductPreviewModalProps { open: boolean; onClose: () => void; product: PreviewProduct; attributes: PreviewAttribute[]; price: number; }

export const ProductPreviewModal = ({ open, onClose, product, attributes, price }: ProductPreviewModalProps) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>תצוגת מזמין <Button aria-label="סגור" onClick={onClose}><CloseRoundedIcon /></Button></DialogTitle>
    <DialogContent dividers>
      <Typography variant="overline" color="secondary">{product.category || 'קטגוריה'}</Typography>
      <Typography variant="h5">{product.name || 'שם המוצר'}</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>{product.description || 'תיאור המוצר שיוצג למזמין'}</Typography>
      <Stack gap={2}>{attributes.map((attribute) => attribute.attributeType === 'SELECT' ? <TextField key={attribute.id} select fullWidth label={`${attribute.attributeName}${attribute.isRequired ? ' *' : ''}`} defaultValue=""><MenuItem value="">בחירה</MenuItem>{attribute.options.map((option) => <MenuItem key={option.id} value={option.optionValue}>{option.optionLabel}</MenuItem>)}</TextField> : <TextField key={attribute.id} fullWidth label={`${attribute.attributeName}${attribute.isRequired ? ' *' : ''}`} type={attribute.attributeType === 'NUMBER' ? 'number' : 'text'} inputProps={{ min: attribute.minValue ?? undefined, max: attribute.maxValue ?? undefined }} />)}</Stack>
      <Typography variant="h6" sx={{ mt: 3 }}>מחיר החל מ־₪{price.toFixed(2)}</Typography>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>חזרה לעריכה</Button><Button variant="contained" disabled>הוספה להזמנה</Button></DialogActions>
  </Dialog>
);