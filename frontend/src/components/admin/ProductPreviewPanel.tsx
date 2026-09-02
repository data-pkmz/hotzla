import React, { useState } from 'react';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { BuilderAttribute } from '../../pages/admin/ProductBuilderPage';

export interface PreviewProduct {
  name: string;
  description: string;
  category: string;
  basePrice: string;
  imageUrl?: string | null;
  minQuantity?: number;
  maxQuantity?: number | null;
}

export interface ProductPreviewPanelProps {
  product: PreviewProduct;
  attributes: BuilderAttribute[];
  price?: number;
}

export const ProductPreviewPanel: React.FC<ProductPreviewPanelProps> = ({
  product,
  attributes,
}) => {
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  const [numberValues, setNumberValues] = useState<Record<string, number>>({});
  const [boolValues, setBoolValues] = useState<Record<string, boolean>>({});
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState<number>(product.minQuantity || 1);

  // Calculate live dynamic preview price
  const calculatedPrice = React.useMemo(() => {
    let base = Number(product.basePrice) || 0;
    let multiplier = 1;

    for (const attr of attributes) {
      if (attr.attributeType === 'SELECT') {
        const chosenVal = selectedValues[attr.id];
        const chosenOpt = attr.options.find(
          (o) => o.optionValue === chosenVal || o.optionLabel === chosenVal
        );
        if (chosenOpt) {
          const mod = Number(chosenOpt.priceModifier) || 0;
          if (chosenOpt.priceModifierType === 'MULTIPLY') {
            multiplier *= mod > 0 ? mod : 1;
          } else {
            base += chosenOpt.isPerUnit ? mod * quantity : mod;
          }
        }
      } else if (attr.attributeType === 'NUMBER') {
        const num = numberValues[attr.id] || 0;
        if (attr.pricingRule === 'PER_UNIT_MULTIPLIER' && attr.unitPrice) {
          base += Number(attr.unitPrice) * num;
        }
      }
    }

    return (base * multiplier * quantity).toFixed(2);
  }, [product.basePrice, attributes, selectedValues, numberValues, quantity]);

  return (
    <Paper
      sx={{
        position: { xs: 'static', md: 'sticky' },
        top: { md: 24 },
        width: '100%',
        maxHeight: { md: 'calc(100vh - 120px)' },
        overflowY: { md: 'auto' },
        zIndex: 2,
        p: { xs: 2, md: 2.5 },
        border: '1px solid',
        borderTop: '4px solid',
        borderColor: 'divider',
        borderTopColor: 'primary.main',
        bgcolor: '#f8fafc',
        borderRadius: 2,
        boxShadow: '0 10px 28px rgba(9,35,64,.08)',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <VisibilityOutlinedIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            תצוגה מקדימה (לקוח)
          </Typography>
        </Stack>
        <Chip label="בזמן אמת" size="small" color="primary" variant="outlined" />
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0 4px 14px rgba(9,35,64,.05)',
        }}
      >
        <Typography variant="overline" color="primary.main" fontWeight={700}>
          {product.category || 'קטגוריית מוצר'}
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5, mb: 1 }}>
          {product.name || 'שם המוצר שייקבע'}
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
          {product.description || 'תיאור המוצר, מאפייניו והנחיות למזמין יופיעו כאן...'}
        </Typography>

        {product.imageUrl && (
          <Box
            component="img"
            src={product.imageUrl}
            alt={product.name || 'תמונת מוצר'}
            sx={{
              width: '100%',
              maxHeight: 180,
              objectFit: 'cover',
              borderRadius: 1.5,
              mb: 2.5,
            }}
          />
        )}

        <Stack gap={2.5}>
          {attributes.map((attribute) => (
            <Box key={attribute.id}>
              {attribute.attributeType === 'SELECT' && (
                <FormControl fullWidth size="small">
                  <FormLabel sx={{ mb: 0.75, fontWeight: 600, color: 'text.primary' }}>
                    {attribute.attributeName}
                    {attribute.isRequired && <span style={{ color: '#d32f2f' }}> *</span>}
                  </FormLabel>

                  {attribute.displayStyle === 'CARDS' ? (
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {attribute.options.map((opt) => {
                        const isSelected =
                          selectedValues[attribute.id] === opt.optionValue ||
                          selectedValues[attribute.id] === opt.optionLabel;
                        return (
                          <Card
                            key={opt.id}
                            variant="outlined"
                            sx={{
                              borderColor: isSelected ? 'primary.main' : 'divider',
                              bgcolor: isSelected ? 'primary.50' : 'background.paper',
                              borderWidth: isSelected ? 2 : 1,
                              borderRadius: 1.5,
                              minWidth: 100,
                            }}
                          >
                            <CardActionArea
                              onClick={() =>
                                setSelectedValues({
                                  ...selectedValues,
                                  [attribute.id]: opt.optionValue || opt.optionLabel,
                                })
                              }
                              sx={{ p: 1.25, textAlign: 'center' }}
                            >
                              <Typography variant="body2" fontWeight={isSelected ? 700 : 500}>
                                {opt.optionLabel || 'אפשרות'}
                              </Typography>
                              {opt.priceModifier > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  +{opt.priceModifier} ₪
                                </Typography>
                              )}
                            </CardActionArea>
                          </Card>
                        );
                      })}
                    </Stack>
                  ) : (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={selectedValues[attribute.id] || ''}
                      onChange={(e) =>
                        setSelectedValues({
                          ...selectedValues,
                          [attribute.id]: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="" disabled>
                        בחירת {attribute.attributeName}
                      </MenuItem>
                      {attribute.options.map((opt) => (
                        <MenuItem key={opt.id} value={opt.optionValue || opt.optionLabel}>
                          {opt.optionLabel}
                          {opt.priceModifier > 0 && ` (+${opt.priceModifier} ₪)`}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </FormControl>
              )}

              {attribute.attributeType === 'NUMBER' && (
                <FormControl fullWidth size="small">
                  <FormLabel sx={{ mb: 0.75, fontWeight: 600, color: 'text.primary' }}>
                    {attribute.attributeName}
                    {attribute.isRequired && <span style={{ color: '#d32f2f' }}> *</span>}
                  </FormLabel>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{
                      min: attribute.minValue ?? undefined,
                      max: attribute.maxValue ?? undefined,
                    }}
                    value={numberValues[attribute.id] || ''}
                    placeholder={`הזן ערך${
                      attribute.minValue !== null ? ` (מינימום ${attribute.minValue})` : ''
                    }`}
                    onChange={(e) =>
                      setNumberValues({
                        ...numberValues,
                        [attribute.id]: Number(e.target.value),
                      })
                    }
                  />
                </FormControl>
              )}

              {attribute.attributeType === 'BOOLEAN' && (
                <FormControlLabel
                  control={
                    attribute.displayStyle === 'CHECKBOX' ? (
                      <Checkbox
                        checked={Boolean(boolValues[attribute.id])}
                        onChange={(e) =>
                          setBoolValues({ ...boolValues, [attribute.id]: e.target.checked })
                        }
                      />
                    ) : (
                      <Switch
                        checked={Boolean(boolValues[attribute.id])}
                        onChange={(e) =>
                          setBoolValues({ ...boolValues, [attribute.id]: e.target.checked })
                        }
                      />
                    )
                  }
                  label={
                    <Typography variant="body2" fontWeight={600}>
                      {attribute.attributeName}
                      {attribute.isRequired && <span style={{ color: '#d32f2f' }}> *</span>}
                    </Typography>
                  }
                />
              )}

              {attribute.attributeType === 'TEXT' && (
                <FormControl fullWidth size="small">
                  <FormLabel sx={{ mb: 0.75, fontWeight: 600, color: 'text.primary' }}>
                    {attribute.attributeName}
                    {attribute.isRequired && <span style={{ color: '#d32f2f' }}> *</span>}
                  </FormLabel>
                  <TextField
                    size="small"
                    multiline={attribute.displayStyle === 'MULTI_LINE'}
                    rows={attribute.displayStyle === 'MULTI_LINE' ? 3 : 1}
                    value={textValues[attribute.id] || ''}
                    placeholder="הקלד טקסט..."
                    onChange={(e) =>
                      setTextValues({ ...textValues, [attribute.id]: e.target.value })
                    }
                  />
                </FormControl>
              )}

              {attribute.attributeType === 'FILE_UPLOAD' && (
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
                    {attribute.attributeName}
                    {attribute.isRequired && <span style={{ color: '#d32f2f' }}> *</span>}
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      border: '1.5px dashed',
                      borderColor: 'primary.light',
                      borderRadius: 1.5,
                      bgcolor: '#f1f5f9',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <CloudUploadOutlinedIcon color="primary" sx={{ fontSize: 28, mb: 0.5 }} />
                    <Typography variant="caption" display="block">
                      גרור קובץ לכאן או לחץ לבחירה
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          ))}

          {/* Quantity selector */}
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" fontWeight={600}>
              כמות להזמנה:
            </Typography>
            <TextField
              size="small"
              type="number"
              inputProps={{ min: product.minQuantity || 1, max: product.maxQuantity || undefined }}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              sx={{ width: 100 }}
            />
          </Stack>

          {/* Price summary */}
          <Paper
            sx={{
              p: 2,
              bgcolor: 'primary.50',
              border: '1px solid',
              borderColor: 'primary.light',
              borderRadius: 1.5,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" color="text.secondary">
                מחיר משוער להזמנה:
              </Typography>
              <Typography variant="h5" color="primary.main" fontWeight={800}>
                ₪{calculatedPrice}
              </Typography>
            </Stack>
          </Paper>

          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled
            startIcon={<ShoppingBagOutlinedIcon />}
            sx={{ borderRadius: 1.5, py: 1.25 }}
          >
            הוספה לסל (תצוגה מקדימה)
          </Button>
        </Stack>
      </Paper>
    </Paper>
  );
};

export default ProductPreviewPanel;
