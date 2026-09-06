import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
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

const FILE_UPLOAD_NAME = 'קובץ להדפסה';

const createAttribute = (
  order: number,
  attributeType: AttributeType = 'SELECT'
): BuilderAttribute => {
  let displayStyle: AttributeDisplayStyle = 'DROPDOWN';

  if (attributeType === 'NUMBER') displayStyle = 'NUMBER_INPUT';
  if (attributeType === 'BOOLEAN') displayStyle = 'SWITCH';
  if (attributeType === 'TEXT') displayStyle = 'SINGLE_LINE';

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

const createFileUploadAttribute = (order: number): BuilderAttribute => ({
  id: crypto.randomUUID(),
  attributeName: FILE_UPLOAD_NAME,
  attributeType: 'FILE_UPLOAD',
  displayStyle: 'FILE_DROPZONE',
  isRequired: true,
  displayOrder: order,
  pricingRule: 'NONE',
  unitPrice: null,
  minValue: null,
  maxValue: null,
  options: [],
});

const normalizeAttributes = (attributes: BuilderAttribute[]): BuilderAttribute[] => {
  const regularAttributes = attributes.filter(
    (attribute) => attribute.attributeType !== 'FILE_UPLOAD'
  );

  const existingUpload = attributes.find((attribute) => attribute.attributeType === 'FILE_UPLOAD');

  const uploadAttribute: BuilderAttribute = existingUpload
    ? {
        ...existingUpload,
        attributeName: FILE_UPLOAD_NAME,
        attributeType: 'FILE_UPLOAD',
        displayStyle: 'FILE_DROPZONE',
        isRequired: true,
        pricingRule: 'NONE',
        unitPrice: null,
        minValue: null,
        maxValue: null,
        options: [],
      }
    : createFileUploadAttribute(regularAttributes.length);

  return [...regularAttributes, uploadAttribute].map((attribute, index) => ({
    ...attribute,
    displayOrder: index,
  }));
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

const validateAttributes = (attributes: BuilderAttribute[]): string | null => {
  const uploadAttributes = attributes.filter(
    (attribute) => attribute.attributeType === 'FILE_UPLOAD'
  );

  if (uploadAttributes.length !== 1) {
    return 'המוצר חייב להכיל שדה העלאת קובץ אחד בדיוק';
  }

  if (attributes.at(-1)?.attributeType !== 'FILE_UPLOAD') {
    return 'שדה העלאת הקובץ חייב להיות השדה האחרון';
  }

  for (const attribute of attributes) {
    if (!attribute.attributeName.trim()) {
      return 'שם מאפיין אינו יכול להיות ריק';
    }

    if (attribute.unitPrice !== null && attribute.unitPrice !== undefined) {
      const unitPrice = Number(attribute.unitPrice);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return `מחיר היחידה של "${attribute.attributeName}" אינו תקין`;
      }
    }

    if (attribute.minValue !== null && attribute.minValue !== undefined) {
      const minValue = Number(attribute.minValue);

      if (!Number.isFinite(minValue) || minValue < 0) {
        return `הערך המינימלי של "${attribute.attributeName}" אינו תקין`;
      }
    }

    if (attribute.maxValue !== null && attribute.maxValue !== undefined) {
      const maxValue = Number(attribute.maxValue);

      if (!Number.isFinite(maxValue) || maxValue < 0) {
        return `הערך המקסימלי של "${attribute.attributeName}" אינו תקין`;
      }
    }

    if (
      attribute.minValue !== null &&
      attribute.minValue !== undefined &&
      attribute.maxValue !== null &&
      attribute.maxValue !== undefined &&
      Number(attribute.maxValue) < Number(attribute.minValue)
    ) {
      return `הערך המקסימלי של "${attribute.attributeName}" חייב להיות גדול או שווה לערך המינימלי`;
    }

    if (attribute.attributeType === 'SELECT' && attribute.options.length < 2) {
      return `המאפיין "${attribute.attributeName}" חייב להכיל לפחות שתי אפשרויות`;
    }

    for (const option of attribute.options) {
      if (!option.optionLabel.trim()) {
        return `אחת האפשרויות במאפיין "${attribute.attributeName}" חסרה שם`;
      }

      const priceModifier = Number(option.priceModifier);

      if (!Number.isFinite(priceModifier) || priceModifier < 0) {
        return `תוספת המחיר של האפשרות "${option.optionLabel}" במאפיין "${attribute.attributeName}" חייבת להיות מספר שאינו שלילי`;
      }
    }
  }

  return null;
};

export const ProductBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductForm>(initialProduct);

  const [attributes, setAttributes] = useState<BuilderAttribute[]>(() => normalizeAttributes([]));

  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const [notice, setNotice] = useState<{
    severity: 'success' | 'error';
    message: string;
  } | null>(null);

  const [addFieldAnchor, setAddFieldAnchor] = useState<HTMLElement | null>(null);

  const basePriceNumber = Number(product.basePrice);

  const basePriceIsValid =
    product.basePrice.trim() !== '' && Number.isFinite(basePriceNumber) && basePriceNumber >= 0;

  const minQuantityIsValid = Number.isInteger(product.minQuantity) && product.minQuantity > 0;

  const maxQuantityIsValid =
    product.maxQuantity === null ||
    (Number.isInteger(product.maxQuantity) &&
      product.maxQuantity > 0 &&
      product.maxQuantity >= product.minQuantity);

  const addAttribute = (attributeType: AttributeType) => {
    if (attributeType === 'FILE_UPLOAD') {
      return;
    }

    setAttributes((current) => {
      const regularAttributes = current.filter(
        (attribute) => attribute.attributeType !== 'FILE_UPLOAD'
      );

      const uploadAttribute =
        current.find((attribute) => attribute.attributeType === 'FILE_UPLOAD') ??
        createFileUploadAttribute(regularAttributes.length);

      const newAttribute = createAttribute(regularAttributes.length, attributeType);

      return normalizeAttributes([...regularAttributes, newAttribute, uploadAttribute]);
    });

    setAddFieldAnchor(null);
  };

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

        setAttributes(normalizeAttributes(loadedAttrs));
      })
      .catch((err: Error) => {
        if (!isCancelled) {
          setNotice({
            severity: 'error',
            message: err.message,
          });
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
      normalizeAttributes(
        current.map((attribute) => {
          if (attribute.id !== attributeId) {
            return attribute;
          }

          if (attribute.attributeType === 'FILE_UPLOAD') {
            return attribute;
          }

          return {
            ...attribute,
            ...patch,
          };
        })
      )
    );
  };

  const moveAttribute = (sourceIndex: number, targetIndex: number) => {
    setAttributes((current) => {
      if (
        sourceIndex === targetIndex ||
        sourceIndex < 0 ||
        targetIndex < 0 ||
        sourceIndex >= current.length ||
        targetIndex >= current.length
      ) {
        return current;
      }

      const source = current[sourceIndex];
      const target = current[targetIndex];

      if (!source || !target) {
        return current;
      }

      if (source.attributeType === 'FILE_UPLOAD' || target.attributeType === 'FILE_UPLOAD') {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);

      next.splice(targetIndex, 0, moved);

      return normalizeAttributes(next);
    });
  };

  const previewPrice = useMemo(() => {
    return (
      Number(product.basePrice || 0) +
      attributes
        .flatMap((attribute) => attribute.options ?? [])
        .reduce((sum, option) => sum + Number(option.priceModifier || 0), 0)
    );
  }, [attributes, product.basePrice]);

  const handleImageChange = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotice({
        severity: 'error',
        message: 'ניתן להעלות קובץ תמונה בלבד (JPG / PNG)',
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const saveProduct = async () => {
    if (!product.name.trim()) {
      setNotice({
        severity: 'error',
        message: 'יש למלא שם מוצר',
      });
      return;
    }

    if (!product.description.trim()) {
      setNotice({
        severity: 'error',
        message: 'יש למלא תיאור מוצר',
      });
      return;
    }

    if (!product.category.trim()) {
      setNotice({
        severity: 'error',
        message: 'יש למלא קטגוריה',
      });
      return;
    }

    if (!basePriceIsValid) {
      setNotice({
        severity: 'error',
        message: 'מחיר הבסיס חייב להיות מספר שאינו שלילי',
      });
      return;
    }

    if (!minQuantityIsValid) {
      setNotice({
        severity: 'error',
        message: 'כמות המינימום חייבת להיות מספר שלם הגדול מאפס',
      });
      return;
    }

    if (!maxQuantityIsValid) {
      setNotice({
        severity: 'error',
        message:
          'כמות המקסימום חייבת להיות מספר שלם הגדול מאפס ולא יכולה להיות קטנה מכמות המינימום',
      });
      return;
    }

    const normalizedAttributes = normalizeAttributes(attributes);

    const attributeError = validateAttributes(normalizedAttributes);

    if (attributeError) {
      setNotice({
        severity: 'error',
        message: attributeError,
      });
      return;
    }

    setSaving(true);

    try {
      const payload: SaveProductPayload = {
        name: product.name.trim(),
        description: product.description.trim(),
        category: product.category.trim(),
        productType: product.productType,
        basePrice: basePriceNumber,
        minQuantity: product.minQuantity,
        maxQuantity: product.maxQuantity,
        isActive: product.isActive,
        imageUrl: imagePreview || '',

        definitions: normalizedAttributes.map((attribute, index) => ({
          attributeName: attribute.attributeName.trim(),
          attributeType: attribute.attributeType,
          displayStyle: attribute.displayStyle,
          isRequired: attribute.isRequired,
          displayOrder: index,
          pricingRule: attribute.pricingRule,

          unitPrice: attribute.unitPrice !== null ? Number(attribute.unitPrice) : null,

          minValue: attribute.minValue !== null ? Number(attribute.minValue) : null,

          maxValue: attribute.maxValue !== null ? Number(attribute.maxValue) : null,

          options: attribute.options.map((option, optionIndex) => ({
            optionLabel: option.optionLabel.trim(),
            optionValue: (option.optionValue || option.optionLabel).trim(),

            priceModifier: Number(option.priceModifier),

            priceModifierType: option.priceModifierType || 'FIXED_ADD',

            displayOrder: optionIndex,
            isPerUnit: Boolean(option.isPerUnit),
          })),
        })),
      };

      const result = id ? await updateAdminProduct(id, payload) : await createAdminProduct(payload);

      setNotice({
        severity: 'success',
        message: id ? 'המוצר עודכן בהצלחה' : 'המוצר הוקם בהצלחה ונוסף לקטלוג',
      });

      if (!id && result?.id) {
        navigate(`/admin/builder/${result.id}`, {
          replace: true,
        });
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
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1440,
        mx: 'auto',
        pb: 4,
        px: { xs: 1, md: 0 },
        direction: 'rtl',
      }}
    >
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

        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveRoundedIcon />}
          onClick={saveProduct}
          disabled={saving}
          sx={{ px: 3, borderRadius: 2 }}
        >
          {saving ? 'שומר...' : id ? 'שמור שינויים' : 'הקם מוצר'}
        </Button>
      </Stack>

      <Box
        sx={{
          display: { xs: 'block', md: 'grid' },
          gridTemplateColumns: {
            md: 'minmax(0, 1fr) minmax(320px, 380px)',
          },
          gap: { xs: 2.5, md: 3 },
          direction: { md: 'ltr' },
          alignItems: 'start',
        }}
      >
        <Box sx={{ direction: 'rtl', minWidth: 0 }}>
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
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '1.2fr 1fr 1fr',
                },
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
                onChange={(event) =>
                  setProduct({
                    ...product,
                    name: event.target.value,
                  })
                }
              />

              <Autocomplete
                freeSolo
                options={categories}
                value={product.category}
                onInputChange={(_event, value) =>
                  setProduct({
                    ...product,
                    category: value,
                  })
                }
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
                inputProps={{
                  min: 0,
                  step: '0.01',
                }}
                value={product.basePrice}
                error={!basePriceIsValid}
                helperText={!basePriceIsValid ? 'המחיר לא יכול להיות שלילי' : undefined}
                onChange={(event) =>
                  setProduct({
                    ...product,
                    basePrice: event.target.value,
                  })
                }
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
                  onChange={(event) =>
                    setProduct({
                      ...product,
                      isActive: event.target.checked,
                    })
                  }
                />
              </Stack>

              <TextField
                size="small"
                label="כמות מינימום"
                type="number"
                inputProps={{ min: 1, step: 1 }}
                value={product.minQuantity}
                error={!minQuantityIsValid}
                helperText={
                  !minQuantityIsValid ? 'כמות המינימום חייבת להיות מספר שלם הגדול מאפס' : undefined
                }
                onChange={(event) =>
                  setProduct({
                    ...product,
                    minQuantity: Number(event.target.value),
                  })
                }
              />

              <TextField
                fullWidth
                size="small"
                label="כמות מקסימום (אופציונלי)"
                type="number"
                inputProps={{ min: 1, step: 1 }}
                value={product.maxQuantity ?? ''}
                placeholder="ללא הגבלה"
                error={!maxQuantityIsValid}
                helperText={
                  !maxQuantityIsValid
                    ? 'כמות המקסימום חייבת להיות גדולה או שווה לכמות המינימום'
                    : undefined
                }
                InputLabelProps={{
                  shrink: true,
                  sx: {
                    maxWidth: 'none',
                    overflow: 'visible',
                    whiteSpace: 'nowrap',
                  },
                }}
                sx={{
                  minWidth: 0,
                  '& .MuiInputLabel-root': {
                    maxWidth: 'none',
                    overflow: 'visible',
                    textOverflow: 'clip',
                  },
                }}
                onChange={(event) =>
                  setProduct({
                    ...product,
                    maxQuantity: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
              />

              <TextField
                sx={{ gridColumn: { md: '1 / 3' } }}
                size="small"
                label="תיאור המוצר"
                multiline
                minRows={3}
                required
                placeholder="הסבר קצר על המוצר, שימושיו, והנחיות מיוחדות..."
                value={product.description}
                onChange={(event) =>
                  setProduct({
                    ...product,
                    description: event.target.value,
                  })
                }
              />

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
                  '&:hover': {
                    bgcolor: '#f1f5f9',
                  },
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
              gap={2}
              sx={{ mb: 2.5 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                  <Typography variant="h6" fontWeight={700}>
                    מאפיינים ותכונות דינמיות
                  </Typography>

                  <Chip label={`${attributes.length} שדות`} size="small" color="primary" />
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  סדר המאפיינים ברשימה הוא הסדר שבו יוצגו בטופס למזמין. שדה העלאת הקובץ קבוע ותמיד
                  מוצג אחרון.
                </Typography>
              </Box>

              <Button
                size="small"
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={(event) => setAddFieldAnchor(event.currentTarget)}
                sx={{
                  borderRadius: 1.5,
                  flexShrink: 0,
                }}
              >
                הוסף מאפיין
              </Button>

              <Menu
                anchorEl={addFieldAnchor}
                open={Boolean(addFieldAnchor)}
                onClose={() => setAddFieldAnchor(null)}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <MenuItem onClick={() => addAttribute('SELECT')}>רשימת בחירה (Select)</MenuItem>

                <MenuItem onClick={() => addAttribute('NUMBER')}>שדה מספרי (Number)</MenuItem>

                <MenuItem onClick={() => addAttribute('BOOLEAN')}>כן / לא (Boolean)</MenuItem>

                <MenuItem onClick={() => addAttribute('TEXT')}>טקסט חופשי (Text)</MenuItem>
              </Menu>
            </Stack>

            <Stack divider={<Divider flexItem />} gap={2.5}>
              {attributes.map((attribute, index) => {
                const isFileUpload = attribute.attributeType === 'FILE_UPLOAD';

                const canMoveUp = !isFileUpload && index > 0;

                const canMoveDown = !isFileUpload && index < attributes.length - 2;

                return (
                  <Box
                    key={attribute.id}
                    draggable={!isFileUpload}
                    onDragStart={(event) => {
                      if (isFileUpload) {
                        event.preventDefault();
                        return;
                      }

                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(index));
                    }}
                    onDragOver={(event) => {
                      if (!isFileUpload) {
                        event.preventDefault();
                      }
                    }}
                    onDrop={(event) => {
                      if (isFileUpload) {
                        return;
                      }

                      event.preventDefault();

                      moveAttribute(Number(event.dataTransfer.getData('text/plain')), index);
                    }}
                    sx={{
                      p: 2,
                      bgcolor: isFileUpload ? '#f3f6fb' : '#f8fafc',
                      border: '1px solid',
                      borderColor: isFileUpload ? 'primary.light' : 'divider',
                      borderRadius: 1.5,
                    }}
                  >
                    <Stack gap={1.25} sx={{ mb: 1.5 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        gap={1}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          gap={1}
                          flexWrap="wrap"
                          sx={{ minWidth: 0 }}
                        >
                          {isFileUpload ? (
                            <LockRoundedIcon color="primary" fontSize="small" />
                          ) : (
                            <Box
                              sx={{
                                display: 'flex',
                                cursor: 'grab',
                                color: 'text.secondary',
                                userSelect: 'none',
                                flexShrink: 0,
                              }}
                              aria-label="גרור לשינוי סדר"
                              title="גרור לשינוי סדר"
                            >
                              <DragIndicatorRoundedIcon />
                            </Box>
                          )}

                          <Chip
                            label={attributeTypeLabels[attribute.attributeType]}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ flexShrink: 0 }}
                          />

                          {isFileUpload && (
                            <Chip
                              label="שדה קבוע"
                              size="small"
                              variant="outlined"
                              sx={{ flexShrink: 0 }}
                            />
                          )}
                        </Stack>

                        {!isFileUpload && (
                          <Stack
                            direction="row"
                            alignItems="center"
                            gap={0.5}
                            sx={{ flexShrink: 0 }}
                          >
                            <IconButton
                              size="small"
                              disabled={!canMoveUp}
                              onClick={() => moveAttribute(index, index - 1)}
                              title="הזז למעלה"
                            >
                              <ArrowUpwardRoundedIcon fontSize="small" />
                            </IconButton>

                            <IconButton
                              size="small"
                              disabled={!canMoveDown}
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
                                setAttributes((current) =>
                                  normalizeAttributes(
                                    current.filter((item) => item.id !== attribute.id)
                                  )
                                )
                              }
                            >
                              הסרה
                            </Button>
                          </Stack>
                        )}
                      </Stack>

                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        title={attribute.attributeName}
                        sx={{
                          width: '100%',
                          minWidth: 0,
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          lineHeight: 1.5,
                        }}
                      >
                        #{index + 1} {attribute.attributeName}
                      </Typography>
                    </Stack>
                    {isFileUpload ? (
                      <Alert severity="info" icon={<CloudUploadRoundedIcon />}>
                        שדה זה נוסף אוטומטית לכל מוצר, הוא חובה ותמיד יוצג אחרון בטופס ההזמנה.
                      </Alert>
                    ) : (
                      <AttributeDefinitionForm
                        attribute={attribute}
                        onChange={(patch) => updateAttribute(attribute.id, patch)}
                      />
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Box>

        <Box sx={{ direction: 'rtl', minWidth: 0 }}>
          <ProductPreviewPanel
            product={{
              ...product,
              imageUrl: imagePreview,
            }}
            attributes={attributes}
            price={previewPrice}
          />
        </Box>
      </Box>

      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice(null)}>
        <Alert
          severity={notice?.severity}
          onClose={() => setNotice(null)}
          sx={{
            width: '100%',
            boxShadow: 3,
          }}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductBuilderPage;
