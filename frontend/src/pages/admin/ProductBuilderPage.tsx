import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type {
  AttributeDisplayStyle,
  AttributeType,
  ProductAttributeDefinition,
  ProductAttributeOption,
} from 'shared-types';
import { AttributeDefinitionForm } from '../../components/admin/AttributeDefinitionForm';
import { ProductPreviewPanel } from '../../components/admin/ProductPreviewPanel';
import { getProducts } from '../../services/api/catalog.service';
import {
  createAdminProduct,
  getAdminProductById,
  updateAdminProduct,
  type SaveProductPayload,
} from '../../services/api/admin-catalog.service';

export type BuilderOption = Omit<ProductAttributeOption, 'id' | 'attributeDefinitionId'> & {
  id: string;
};

export type BuilderAttribute = Omit<
  ProductAttributeDefinition,
  'id' | 'productId' | 'options' | 'attributeOptionEntries'
> & {
  id: string;
  options: BuilderOption[];
};

interface ProductForm {
  name: string;
  description: string;
  category: string;
  basePrice: string;
  productType: 'FIXED' | 'DYNAMIC';
  minQuantity: number;
  maxQuantity: number | null;
  isActive: boolean;
}

const createAttribute = (
  order: number,
  attributeType: AttributeType = 'SELECT'
): BuilderAttribute => {
  let displayStyle: AttributeDisplayStyle = 'DROPDOWN';
  if (attributeType === 'NUMBER') displayStyle = 'NUMBER_INPUT';
  if (attributeType === 'BOOLEAN') displayStyle = 'SWITCH';
  if (attributeType === 'TEXT') displayStyle = 'SINGLE_LINE';
  if (attributeType === 'FILE_UPLOAD') displayStyle = 'FILE_DROPZONE';

  return {
    id: crypto.randomUUID(),
    attributeName: 'מאפיין חדש',
    attributeType,
    displayStyle,
    isRequired: false,
    displayOrder: order,
    pricingRule: 'FLAT_ADD_PER_OPTION',
    unitPrice: null,
    minValue: null,
    maxValue: null,
    options:
      attributeType === 'SELECT'
        ? [
            {
              id: crypto.randomUUID(),
              optionLabel: 'אפשרות 1',
              optionValue: 'option_1',
              priceModifier: 0,
              priceModifierType: 'FIXED_ADD',
              displayOrder: 0,
              isPerUnit: false,
            },
            {
              id: crypto.randomUUID(),
              optionLabel: 'אפשרות 2',
              optionValue: 'option_2',
              priceModifier: 0,
              priceModifierType: 'FIXED_ADD',
              displayOrder: 1,
              isPerUnit: false,
            },
          ]
        : [],
  };
};

const initialProduct: ProductForm = {
  name: '',
  description: '',
  category: '',
  basePrice: '0',
  productType: 'DYNAMIC',
  minQuantity: 1,
  maxQuantity: null,
  isActive: true,
};

const attributeTypeLabels: Record<AttributeType, string> = {
  SELECT: 'בחירה',
  NUMBER: 'מספר',
  BOOLEAN: 'כן / לא',
  TEXT: 'טקסט פתוח',
  FILE_UPLOAD: 'העלאת קובץ',
};

export const ProductBuilderPage: React.FC = () => {
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

  const addAttribute = (attributeType: AttributeType) => {
    setAttributes([...attributes, createAttribute(attributes.length, attributeType)]);
    setAddFieldAnchor(null);
  };

  // Load existing categories for autocomplete
  useEffect(() => {
    getProducts()
      .then((items) => {
        const values = items
          .map((item) => item.category?.trim())
          .filter((cat): cat is string => Boolean(cat));
        setCategories([...new Set<string>(values)]);
      })
      .catch(() => setCategories([]));
  }, []);

  // Load product data if editing an existing product
  useEffect(() => {
    if (!id) return;
    let isCancelled = false;

    getAdminProductById(id)
      .then((data) => {
        if (isCancelled) return;
        setProduct({
          name: data.name ?? '',
          description: data.description ?? '',
          category: data.category ?? '',
          basePrice: String(data.basePrice ?? 0),
          productType: data.productType ?? 'DYNAMIC',
          minQuantity: data.minQuantity ?? 1,
          maxQuantity: data.maxQuantity ?? null,
          isActive: data.isActive ?? true,
        });
        setImagePreview(data.imageUrl ?? null);

        const loadedAttrs: BuilderAttribute[] = (
          data.attributeDefinitionEntries ??
          data.attributes ??
          []
        ).map((attr: ProductAttributeDefinition, idx: number) => {
          const rawOptions = attr.options ?? attr.attributeOptionEntries ?? [];
          return {
            id: attr.id || crypto.randomUUID(),
            attributeName: attr.attributeName,
            attributeType: attr.attributeType,
            displayStyle: attr.displayStyle,
            isRequired: attr.isRequired ?? false,
            displayOrder: attr.displayOrder ?? idx,
            pricingRule: attr.pricingRule ?? 'NONE',
            unitPrice: attr.unitPrice ?? null,
            minValue: attr.minValue ?? null,
            maxValue: attr.maxValue ?? null,
            options: rawOptions.map((opt: ProductAttributeOption, optIdx: number) => ({
              id: opt.id || crypto.randomUUID(),
              optionLabel: opt.optionLabel,
              optionValue: opt.optionValue,
              priceModifier: opt.priceModifier ?? 0,
              priceModifierType: opt.priceModifierType ?? 'FIXED_ADD',
              displayOrder: opt.displayOrder ?? optIdx,
              isPerUnit: opt.isPerUnit ?? false,
            })),
          };
        });

        setAttributes(loadedAttrs);
      })
      .catch((err: Error) => {
        if (!isCancelled) {
          setNotice({ severity: 'error', message: err.message });
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [id]);

  const updateAttribute = (attributeId: string, patch: Partial<BuilderAttribute>) => {
    setAttributes((current) =>
      current.map((attr) => (attr.id === attributeId ? { ...attr, ...patch } : attr))
    );
  };

  const moveAttribute = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex || targetIndex < 0 || targetIndex >= attributes.length) return;
    setAttributes((current) => {
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((attr, order) => ({ ...attr, displayOrder: order }));
    });
  };

  const previewPrice = useMemo(() => {
    return (
      Number(product.basePrice || 0) +
      attributes
        .flatMap((attr) => attr.options ?? [])
        .reduce((sum, opt) => sum + Number(opt.priceModifier || 0), 0)
    );
  }, [attributes, product.basePrice]);

  const handleImageChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice({ severity: 'error', message: 'ניתן להעלות קובץ תמונה בלבד (JPG / PNG)' });
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
      const payload: SaveProductPayload = {
        name: product.name.trim(),
        description: product.description.trim(),
        category: product.category.trim(),
        productType: product.productType,
        basePrice: Number(product.basePrice) || 0,
        minQuantity: Number(product.minQuantity) || 1,
        maxQuantity: product.maxQuantity ? Number(product.maxQuantity) : null,
        isActive: product.isActive,
        imageUrl: imagePreview || '',
        definitions: attributes.map((attr, idx) => ({
          attributeName: attr.attributeName.trim(),
          attributeType: attr.attributeType,
          displayStyle: attr.displayStyle,
          isRequired: attr.isRequired,
          displayOrder: idx,
          pricingRule: attr.pricingRule,
          unitPrice: attr.unitPrice !== null ? Number(attr.unitPrice) : null,
          minValue: attr.minValue !== null ? Number(attr.minValue) : null,
          maxValue: attr.maxValue !== null ? Number(attr.maxValue) : null,
          options: attr.options.map((opt, optIdx) => ({
            optionLabel: opt.optionLabel.trim(),
            optionValue: (opt.optionValue || opt.optionLabel).trim(),
            priceModifier: Number(opt.priceModifier) || 0,
            priceModifierType: opt.priceModifierType || 'FIXED_ADD',
            displayOrder: optIdx,
            isPerUnit: Boolean(opt.isPerUnit),
          })),
        })),
      };

      const result = id ? await updateAdminProduct(id, payload) : await createAdminProduct(payload);

      setNotice({
        severity: 'success',
        message: id ? 'המוצר עודכן בהצלחה' : 'המוצר הוקם בהצלחה ונוסף לקטלוג',
      });

      if (!id && result?.id) {
        navigate(`/admin/builder/${result.id}`, { replace: true });
      }
    } catch (err) {
      setNotice({
        severity: 'error',
        message: err instanceof Error ? err.message : 'שמירת המוצר נכשלה',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 4, px: { xs: 1, md: 0 }, direction: 'rtl' }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        gap={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" gap={1}>
            <AutoAwesomeRoundedIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" fontWeight={700}>
              בונה מוצר דינמי
            </Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            הגדרת מוצרים מותאמים אישית, תכונות דינמיות וכללי תמחור למערכת ההזמנות.
          </Typography>
        </Box>

        <Stack direction="row" gap={1.5}>
          <Button
            variant="contained"
            size="large"
            startIcon={
              saving ? <CircularProgress size={20} color="inherit" /> : <SaveRoundedIcon />
            }
            onClick={saveProduct}
            disabled={saving}
            sx={{ px: 3, borderRadius: 2 }}
          >
            {saving ? 'שומר...' : id ? 'שמור שינויים' : 'הקם מוצר'}
          </Button>
        </Stack>
      </Stack>

      {/* Main Grid: Form Left / Center, Preview Right */}
      <Box
        sx={{
          display: { xs: 'block', md: 'grid' },
          gridTemplateColumns: { md: 'minmax(0, 1fr) minmax(320px, 380px)' },
          gap: { xs: 2.5, md: 3 },
          direction: { md: 'ltr' },
          alignItems: 'start',
        }}
      >
        {/* Product Editor Form */}
        <Box sx={{ direction: 'rtl', minWidth: 0 }}>
          {/* Card 1: Basic Settings */}
          <Paper
            sx={{
              p: { xs: 2, md: 3 },
              mb: 3,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(9,35,64,.04)',
            }}
          >
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2.5 }}>
              <TuneRoundedIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                פרטי מוצר בסיסיים
              </Typography>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr' },
                gap: 2,
              }}
            >
              <TextField
                sx={{ gridColumn: '1 / -1' }}
                size="small"
                label="שם מוצר"
                placeholder="לדוגמה: פוסטר מעוצב 70x100, חוברת מהודרת"
                required
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
              />

              <Autocomplete
                freeSolo
                options={categories}
                value={product.category}
                onInputChange={(_e, val) => setProduct({ ...product, category: val })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="קטגוריה"
                    placeholder="בחר או הקלד קטגוריה"
                    required
                  />
                )}
              />

              <TextField
                size="small"
                label="מחיר בסיס (₪)"
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
                value={product.basePrice}
                onChange={(e) => setProduct({ ...product, basePrice: e.target.value })}
              />

              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 2,
                  py: 0.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: '#f8fafc',
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    סטטוס פעיל
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    גלוי למזמינים
                  </Typography>
                </Box>
                <Switch
                  checked={product.isActive}
                  onChange={(e) => setProduct({ ...product, isActive: e.target.checked })}
                />
              </Stack>

              <TextField
                size="small"
                label="כמות מינימום"
                type="number"
                inputProps={{ min: 1 }}
                value={product.minQuantity}
                onChange={(e) =>
                  setProduct({ ...product, minQuantity: Math.max(1, Number(e.target.value) || 1) })
                }
              />

              <TextField
                size="small"
                label="כמות מקסימום (אופציונלי)"
                type="number"
                inputProps={{ min: 1 }}
                value={product.maxQuantity ?? ''}
                placeholder="ללא הגבלה"
                onChange={(e) =>
                  setProduct({
                    ...product,
                    maxQuantity: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />

              <TextField
                sx={{ gridColumn: { md: '1 / 3' } }}
                size="small"
                label="תיאור המוצר"
                multiline
                minRows={3}
                placeholder="הסבר קצר על המוצר, שימושיו, והנחיות מיוחדות..."
                value={product.description}
                onChange={(e) => setProduct({ ...product, description: e.target.value })}
              />

              {/* Image Uploader */}
              <Box
                onClick={() => imageInputRef.current?.click()}
                sx={{
                  gridColumn: { xs: '1', md: '3' },
                  minHeight: 100,
                  border: '1.5px dashed',
                  borderColor: 'primary.light',
                  borderRadius: 1.5,
                  bgcolor: '#f8fafc',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': { bgcolor: '#f1f5f9' },
                }}
              >
                <input
                  ref={imageInputRef}
                  hidden
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => handleImageChange(e.target.files?.[0])}
                />
                {imagePreview ? (
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="תצוגת תמונה"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      position: 'absolute',
                    }}
                  />
                ) : (
                  <Stack alignItems="center" gap={0.5} sx={{ p: 1.5 }}>
                    <CloudUploadRoundedIcon color="primary" />
                    <Typography variant="caption" fontWeight={600}>
                      העלאת תמונת מוצר
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      JPG או PNG
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Card 2: Dynamic Attributes Builder */}
          <Paper
            sx={{
              p: { xs: 2, md: 3 },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(9,35,64,.04)',
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2.5 }}
            >
              <Box>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Typography variant="h6" fontWeight={700}>
                    מאפיינים ותכונות דינמיות
                  </Typography>
                  <Chip label={`${attributes.length} שדות`} size="small" color="primary" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  סדר המאפיינים ברשימה הוא הסדר שבו יוצגו בטופס למזמין. ניתן לשנות סדר בגרירה או
                  בחיצים.
                </Typography>
              </Box>

              <Button
                size="small"
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={(e) => setAddFieldAnchor(e.currentTarget)}
                sx={{ borderRadius: 1.5 }}
              >
                הוסף מאפיין
              </Button>

              <Menu
                anchorEl={addFieldAnchor}
                open={Boolean(addFieldAnchor)}
                onClose={() => setAddFieldAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem onClick={() => addAttribute('SELECT')}>רשימת בחירה (Select)</MenuItem>
                <MenuItem onClick={() => addAttribute('NUMBER')}>שדה מספרי (Number)</MenuItem>
                <MenuItem onClick={() => addAttribute('BOOLEAN')}>כן / לא (Boolean)</MenuItem>
                <MenuItem onClick={() => addAttribute('TEXT')}>טקסט חופשי (Text)</MenuItem>
                <MenuItem onClick={() => addAttribute('FILE_UPLOAD')}>
                  העלאת קובץ (File Upload)
                </MenuItem>
              </Menu>
            </Stack>

            {attributes.length === 0 ? (
              <Box
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: '#f8fafc',
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                }}
              >
                <Typography color="text.secondary">
                  עדיין לא נוספו מאפיינים למוצר זה. לחץ על "הוסף מאפיין" כדי להגדיר תכונות.
                </Typography>
              </Box>
            ) : (
              <Stack divider={<Divider flexItem />} gap={2.5}>
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
                      p: 2,
                      bgcolor: '#f8fafc',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1.5 }}
                    >
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            display: 'flex',
                            cursor: 'grab',
                            color: 'text.secondary',
                            userSelect: 'none',
                          }}
                          aria-label="גרור לשינוי סדר"
                          title="גרור לשינוי סדר"
                        >
                          <DragIndicatorRoundedIcon />
                        </Box>
                        <Chip
                          label={attributeTypeLabels[attribute.attributeType]}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="subtitle2" fontWeight={700}>
                          #{index + 1} {attribute.attributeName}
                        </Typography>
                      </Stack>

                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <IconButton
                          size="small"
                          disabled={index === 0}
                          onClick={() => moveAttribute(index, index - 1)}
                          title="הזז למעלה"
                        >
                          <ArrowUpwardRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          disabled={index === attributes.length - 1}
                          onClick={() => moveAttribute(index, index + 1)}
                          title="הזז למטה"
                        >
                          <ArrowDownwardRoundedIcon fontSize="small" />
                        </IconButton>
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
            )}
          </Paper>
        </Box>

        {/* Real-time Customer Preview */}
        <Box sx={{ direction: 'rtl', minWidth: 0 }}>
          <ProductPreviewPanel
            product={{ ...product, imageUrl: imagePreview }}
            attributes={attributes}
            price={previewPrice}
          />
        </Box>
      </Box>

      {/* Toast Notification */}
      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice(null)}>
        <Alert
          severity={notice?.severity}
          onClose={() => setNotice(null)}
          sx={{ width: '100%', boxShadow: 3 }}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductBuilderPage;
