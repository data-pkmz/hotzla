import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Menu,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { ProductAttributeDefinition, ProductAttributeOption } from 'shared-types';
import { AttributeDefinitionForm } from '../../components/admin/AttributeDefinitionForm';
import { ProductPreviewModal } from '../../components/admin/ProductPreviewModal';

type BuilderAttribute = Omit<ProductAttributeDefinition, 'id' | 'productId' | 'options'> & {
  id: string;
  options: BuilderOption[];
};
export type BuilderOption = Omit<ProductAttributeOption, 'id' | 'attributeDefinitionId'> & {
  id: string;
};
interface ProductForm {
  name: string;
  description: string;
  category: string;
  basePrice: string;
  productType: 'FIXED' | 'DYNAMIC';
  isActive: boolean;
}
const createAttribute = (order: number, attributeType: BuilderAttribute['attributeType'] = 'SELECT'): BuilderAttribute => ({
  id: crypto.randomUUID(),
  attributeName: 'מאפיין חדש',
  attributeType,
  isRequired: false,
  displayOrder: order,
  pricingRule: 'FLAT_ADD_PER_OPTION',
  unitPrice: null,
  minValue: null,
  maxValue: null,
  selectionMode: 'DROPDOWN',
  isMultipleSelection: false,
  maxLength: null,
  allowedFileTypes: 'IMAGE_AND_PDF',
  allowMultipleFiles: false,
  options: [],
});
const initialProduct: ProductForm = {
  name: '',
  description: '',
  category: '',
  basePrice: '0',
  productType: 'DYNAMIC',
  isActive: true,
};
const attributeTypeLabels: Record<BuilderAttribute['attributeType'], string> = {
  SELECT: 'בחירה',
  NUMBER: 'מספר',
  BOOLEAN: 'כן / לא',
  TEXT: 'טקסט פתוח',
  FILE_UPLOAD: 'העלאת קובץ',
};

export const ProductBuilderPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductForm>(initialProduct);
  const [attributes, setAttributes] = useState<BuilderAttribute[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null
  );
  const [addFieldAnchor, setAddFieldAnchor] = useState<HTMLElement | null>(null);

  const addAttribute = (attributeType: BuilderAttribute['attributeType']) => {
    setAttributes([...attributes, createAttribute(attributes.length, attributeType)]);
    setAddFieldAnchor(null);
  };

  useEffect(() => {
    fetch('/api/products')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('categories'))))
      .then((payload) => {
        const values = (payload.data ?? [])
          .map((item: { category?: string }) => item.category?.trim())
          .filter((category: string | undefined): category is string => Boolean(category));
        setCategories([...new Set<string>(values)]);
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/products/${id}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('לא ניתן לטעון את המוצר');
        return response.json();
      })
      .then((payload) => {
        const data = payload.data;
        setProduct({
          name: data.name ?? '',
          description: data.description ?? '',
          category: data.category ?? '',
          basePrice: String(data.basePrice ?? 0),
          productType: data.productType ?? 'DYNAMIC',
          isActive: data.isActive ?? true,
        });
        setImagePreview(data.imageUrl ?? null);
        setAttributes(
          (data.attributeDefinitionEntries ?? data.attributes ?? []).map(
            (attribute: BuilderAttribute, index: number) => ({
              ...attribute,
              id: attribute.id || crypto.randomUUID(),
              selectionMode: attribute.selectionMode === 'MULTI' ? 'DROPDOWN' : attribute.selectionMode,
              isMultipleSelection: attribute.isMultipleSelection ?? attribute.selectionMode === 'MULTI',
              displayOrder: index,
              options:
                attribute.options ??
                (attribute as BuilderAttribute & { attributeOptionEntries?: BuilderOption[] })
                  .attributeOptionEntries ??
                [],
            })
          )
        );
      })
      .catch((error: Error) => setNotice({ severity: 'error', message: error.message }))
      .finally(() => setLoading(false));
  }, [id]);

  const updateAttribute = (attributeId: string, patch: Partial<BuilderAttribute>) =>
    setAttributes((current) =>
      current.map((attribute) =>
        attribute.id === attributeId ? { ...attribute, ...patch } : attribute
      )
    );
  const moveAttribute = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex || targetIndex < 0 || targetIndex >= attributes.length) return;
    setAttributes((current) => {
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((attribute, order) => ({ ...attribute, displayOrder: order }));
    });
  };
  const previewPrice = useMemo(
    () =>
      Number(product.basePrice || 0) +
      attributes
        .flatMap((attribute) => attribute.options ?? [])
        .reduce((sum, option) => sum + Number(option.priceModifier || 0), 0),
    [attributes, product.basePrice]
  );
  const handleImageChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice({ severity: 'error', message: 'ניתן להעלות תמונה בלבד' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const saveProduct = async () => {
    if (!product.name.trim() || !product.category.trim()) {
      setNotice({ severity: 'error', message: 'יש למלא שם מוצר וקטגוריה' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...product,
        basePrice: Number(product.basePrice) || 0,
        definitions: attributes.map(({ id: _attributeId, options, ...attribute }) => ({
          ...attribute,
          options: options.map(({ id: _optionId, ...option }) => option),
        })),
      };
      const response = await fetch(id ? `/api/admin/products/${id}` : '/api/admin/products', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'שמירת המוצר נכשלה');
      setNotice({ severity: 'success', message: id ? 'המוצר עודכן בהצלחה' : 'המוצר נוצר בהצלחה' });
      if (!id && result.data?.id) navigate(`/admin/builder/${result.data.id}`, { replace: true });
    } catch (error) {
      setNotice({
        severity: 'error',
        message: error instanceof Error ? error.message : 'שמירת המוצר נכשלה',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 360 }}>
        <CircularProgress />
      </Box>
    );
  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 3, px: { xs: 1, md: 0 }, direction: 'rtl' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        gap={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" gap={1}>
            <AutoAwesomeRoundedIcon color="secondary" />
            <Typography variant="h4">בונה מוצר דינמי</Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            הגדר מוצר, אפשרויות וכללי תמחור במקום אחד.
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button
            variant="contained"
            startIcon={
              saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />
            }
            onClick={saveProduct}
            disabled={saving}
          >
              שמירת מוצר
          </Button>
        </Stack>
      </Stack>
      <Box
        sx={{
          display: { xs: 'block', md: 'grid' },
          gridTemplateColumns: { md: 'minmax(0, 1fr) minmax(300px, 360px)' },
          gap: { xs: 2, md: 2 },
          direction: { md: 'ltr' },
          alignItems: 'start',
        }}
      >
        <Box sx={{ direction: 'rtl', minWidth: 0 }}>
          <Paper
            sx={{
              p: { xs: 2, md: 3 },
              mb: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 8px 24px rgba(9,35,64,.06)',
            }}
          >
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2.5 }}>
              <TuneRoundedIcon color="secondary" />
              <Typography variant="h6">הגדרות בסיסיות</Typography>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: '1.2fr 1fr 1fr' },
                gap: 1.5,
              }}
            >
              <TextField
                sx={{ gridColumn: '1 / -1' }}
                size="small"
                label="שם מוצר"
                placeholder="לדוגמה: כרטיסי ביקור פרימיום"
                required
                value={product.name}
                onChange={(event) => setProduct({ ...product, name: event.target.value })}
              />
              <TextField
                select
                size="small"
                label="קטגוריה"
                required
                value={product.category}
                onChange={(event) => setProduct({ ...product, category: event.target.value })}
              >
                <MenuItem value="" disabled>
                  בחירת קטגוריה
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
                {product.category && !categories.includes(product.category) && (
                  <MenuItem value={product.category}>{product.category}</MenuItem>
                )}
              </TextField>
              <TextField
                size="small"
                label="מחיר בסיס (₪)"
                type="number"
                inputProps={{ min: 0, step: '.01' }}
                value={product.basePrice}
                onChange={(event) => setProduct({ ...product, basePrice: event.target.value })}
              />
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  minHeight: 56,
                  bgcolor: 'surface.containerLow',
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    סטטוס פעיל
                  </Typography>
                  <Typography variant="caption">גלוי ללקוחות</Typography>
                </Box>
                <Switch
                  checked={product.isActive}
                  onChange={(event) => setProduct({ ...product, isActive: event.target.checked })}
                />
              </Stack>
              <TextField
                sx={{ gridColumn: { md: '1 / 3' } }}
                size="small"
                label="תיאור קצר"
                multiline
                minRows={4}
                InputProps={{ sx: { minHeight: 116, alignItems: 'flex-start' } }}
                value={product.description}
                onChange={(event) => setProduct({ ...product, description: event.target.value })}
              />
              <Box
                onClick={() => imageInputRef.current?.click()}
                sx={{
                  gridColumn: { xs: '2', md: '3' },
                  minHeight: 116,
                  border: '1px dashed',
                  borderColor: 'primary.light',
                  borderRadius: 1,
                  bgcolor: '#f8faff',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <input
                  ref={imageInputRef}
                  hidden
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(event) => handleImageChange(event.target.files?.[0])}
                />
                {imagePreview ? (
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="תצוגה מקדימה"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }}
                  />
                ) : (
                  <Stack alignItems="center" gap={0.5}>
                    <CloudUploadRoundedIcon color="action" />
                    <Typography variant="caption">העלאת תמונת מוצר</Typography>
                    <Typography variant="caption" color="text.secondary">
                      JPG או PNG
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Box>
          </Paper>
          <Paper
            sx={{
              p: { xs: 2, md: 3 },
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 8px 24px rgba(9,35,64,.06)',
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Box>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Typography variant="h6">רשימת תכונות</Typography>
                  <Chip label={`${attributes.length} שדות`} size="small" />
                </Stack>
                <Typography variant="body2">הסדר כאן יהיה סדר ההופעה בטופס ההזמנה.</Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={(event) => setAddFieldAnchor(event.currentTarget)}
              >
                הוסף שדה
              </Button>
              <Menu
                anchorEl={addFieldAnchor}
                open={Boolean(addFieldAnchor)}
                onClose={() => setAddFieldAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem onClick={() => addAttribute('SELECT')}>בחירה</MenuItem>
                <MenuItem onClick={() => addAttribute('NUMBER')}>מספר</MenuItem>
                <MenuItem onClick={() => addAttribute('BOOLEAN')}>כן / לא</MenuItem>
                <MenuItem onClick={() => addAttribute('TEXT')}>טקסט פתוח</MenuItem>
                <MenuItem onClick={() => addAttribute('FILE_UPLOAD')}>העלאת קובץ</MenuItem>
              </Menu>
            </Stack>
            <Stack divider={<Divider flexItem />} gap={2}>
              {attributes.map((attribute, index) => (
                  <Box
                    key={attribute.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(index));
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      moveAttribute(Number(event.dataTransfer.getData('text/plain')), index);
                    }}
                    sx={{
                      px: { xs: 1.25, md: 1.5 },
                      pt: index ? 2 : 1.5,
                      pb: 1.5,
                      bgcolor: 'surface.containerLow',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box
                        sx={{ display: 'flex', cursor: 'grab', color: 'text.secondary', userSelect: 'none' }}
                        aria-label="גרור לשינוי מיקום"
                        title="גרור לשינוי מיקום"
                      >
                        <DragIndicatorRoundedIcon />
                      </Box>
                      <Chip label={attributeTypeLabels[attribute.attributeType]} size="small" color="primary" variant="outlined" />
                    </Stack>
                    <Stack direction="row">
                      <Button
                        color="error"
                        size="small"
                        startIcon={<DeleteOutlineRoundedIcon />}
                        onClick={() =>
                          setAttributes(attributes.filter((item) => item.id !== attribute.id))
                        }
                      >
                        הסרה
                      </Button>
                    </Stack>
                  </Stack>
                  <AttributeDefinitionForm
                    attribute={attribute}
                    onChange={(patch) => updateAttribute(attribute.id, patch)}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Box>
        <Box sx={{ direction: 'rtl', minWidth: 0 }}>
          <ProductPreviewModal product={{ ...product, imageUrl: imagePreview }} attributes={attributes} price={previewPrice} />
        </Box>
      </Box>
      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice(null)}>
        <Alert severity={notice?.severity} onClose={() => setNotice(null)}>
          {notice?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
export default ProductBuilderPage;
