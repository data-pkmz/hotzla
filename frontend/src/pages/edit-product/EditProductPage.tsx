import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';

import { getAdminProductById, updateProduct } from '../../services/api/catalog.service';

import type { AdminProductDetails, UpdateProductPayload } from '../../services/api/catalog.service';

import { useAuthStore } from '../../store/useAuthStore';

interface ProductFormValues {
  name: string;
  description: string;
  category: string;
  basePrice: string;
  minQuantity: string;
  maxQuantity: string;
  imageUrl: string;
  isActive: boolean;
}

const getInitialValues = (product: AdminProductDetails): ProductFormValues => ({
  name: product.name,
  description: product.description,
  category: product.category,
  basePrice: String(product.basePrice),
  minQuantity: String(product.minQuantity),
  maxQuantity: product.maxQuantity == null ? '' : String(product.maxQuantity),
  imageUrl: product.imageUrl ?? '',
  isActive: product.isActive,
});

export default function EditProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const currentUser = useAuthStore((state) => state.currentUser);

  const isManager = currentUser?.role === 'MANAGER';

  const [editedForm, setEditedForm] = useState<{
    productId: string;
    values: ProductFormValues;
  } | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);

  /**
   * Retrieve the full product configuration.
   * Uses the manager endpoint to support inactive products.
   */
  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: () => getAdminProductById(productId!),
    enabled: isManager && Boolean(productId),
    refetchOnWindowFocus: false,
  });

  const formValues =
    product && editedForm?.productId === product.id
      ? editedForm.values
      : product
        ? getInitialValues(product)
        : null;

  /**
   * Save product changes.
   */
  const updateMutation = useMutation({
    mutationFn: (data: UpdateProductPayload) => updateProduct(productId!, data),

    onSuccess: async () => {
      setSaveSuccess(true);
      setValidationError(null);
      setEditedForm(null);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin-products'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['catalog-products'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin-product', productId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['product', productId],
        }),
      ]);
    },
  });

  const handleFieldChange = <K extends keyof ProductFormValues>(
    field: K,
    value: ProductFormValues[K]
  ) => {
    if (!product || !formValues) {
      return;
    }

    setEditedForm({
      productId: product.id,
      values: {
        ...formValues,
        [field]: value,
      },
    });

    setSaveSuccess(false);
    setValidationError(null);
  };

  /**
   * Validate and submit product properties.
   */
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!formValues || !productId) {
      return;
    }

    const name = formValues.name.trim();
    const description = formValues.description.trim();
    const category = formValues.category.trim();

    const basePrice = Number(formValues.basePrice);
    const minQuantity = Number(formValues.minQuantity);

    const maxQuantity =
      formValues.maxQuantity.trim() === '' ? null : Number(formValues.maxQuantity);

    if (!name || !category) {
      setValidationError('יש למלא את שם המוצר והקטגוריה.');
      return;
    }

    if (formValues.basePrice.trim() === '' || !Number.isFinite(basePrice) || basePrice < 0) {
      setValidationError('יש להזין מחיר בסיס תקין.');
      return;
    }

    if (
      formValues.minQuantity.trim() === '' ||
      !Number.isSafeInteger(minQuantity) ||
      minQuantity < 1
    ) {
      setValidationError('כמות מינימלית חייבת להיות מספר חיובי שלם.');
      return;
    }

    if (maxQuantity !== null && (!Number.isSafeInteger(maxQuantity) || maxQuantity < minQuantity)) {
      setValidationError('הכמות המקסימלית חייבת להיות גדולה או שווה לכמות המינימלית.');
      return;
    }

    const payload: UpdateProductPayload = {
      name,
      description,
      category,
      basePrice,
      minQuantity,
      maxQuantity,
      imageUrl: formValues.imageUrl.trim(),
      isActive: formValues.isActive,
    };

    updateMutation.mutate(payload);
  };

  if (!isManager) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Alert severity="error">אין לך הרשאה לערוך מוצרים.</Alert>
      </Container>
    );
  }

  if (!productId) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Alert severity="error">מזהה המוצר חסר.</Alert>
      </Container>
    );
  }

  if (isLoading || (!isError && !formValues)) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          py: 10,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Alert severity="error">
          {error instanceof Error ? error.message : 'אירעה שגיאה בטעינת המוצר'}
        </Alert>

        <Button sx={{ mt: 2 }} onClick={() => navigate('/')}>
          חזרה לקטלוג
        </Button>
      </Container>
    );
  }

  if (!formValues) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: '100%',
        bgcolor: 'background.paper',
        py: { xs: 3, md: 5 },
        direction: 'rtl',
      }}
    >
      <Container maxWidth="lg">
        {/* Page header */}
        <Stack spacing={2} sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon sx={{ transform: 'scaleX(-1)' }} />}
            onClick={() => navigate('/')}
            sx={{
              alignSelf: 'flex-end',
              direction: 'ltr',
            }}
          >
            חזרה לקטלוג
          </Button>

          <Typography variant="h4" component="h1" dir="ltr" textAlign="left" fontWeight={700}>
            עריכת מוצר
          </Typography>

          <Typography color="text.secondary" dir="ltr" textAlign="left">
            עריכת פרטי המוצר: {product?.name}
          </Typography>
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, md: 4 },
            borderRadius: 3,
          }}
        >
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={4}>
              {/* Product information */}
              <Box>
                <Typography variant="h6" dir="ltr" textAlign="left" fontWeight={700} gutterBottom>
                  פרטי המוצר
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="שם המוצר"
                      value={formValues.name}
                      onChange={(event) => handleFieldChange('name', event.target.value)}
                      sx={{
                        direction: 'ltr',
                        textAlign: 'left',
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="קטגוריה"
                      value={formValues.category}
                      onChange={(event) => handleFieldChange('category', event.target.value)}
                      sx={{
                        direction: 'ltr',
                        textAlign: 'left',
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="תיאור המוצר"
                      value={formValues.description}
                      onChange={(event) => handleFieldChange('description', event.target.value)}
                      sx={{
                        direction: 'ltr',
                        textAlign: 'left',
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="נתיב תמונת המוצר"
                      value={formValues.imageUrl}
                      onChange={(event) => handleFieldChange('imageUrl', event.target.value)}
                      sx={{
                        direction: 'ltr',
                        textAlign: 'left',
                      }}
                      helperText="נתיב התמונה השמורה במערכת"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Pricing and quantities */}
              <Box>
                <Typography variant="h6" fontWeight={700} dir="ltr" textAlign="left" gutterBottom>
                  מחיר וכמויות
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      required
                      label="מחיר בסיס"
                      type="number"
                      value={formValues.basePrice}
                      onChange={(event) => handleFieldChange('basePrice', event.target.value)}
                      sx={{
                        direction: 'ltr',
                        textAlign: 'left',
                      }}
                      inputProps={{
                        min: 0,
                        step: 0.01,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      required
                      label="כמות מינימלית"
                      type="number"
                      value={formValues.minQuantity}
                      onChange={(event) => handleFieldChange('minQuantity', event.target.value)}
                      sx={{
                        direction: 'ltr',
                        textAlign: 'left',
                      }}
                      inputProps={{
                        min: 1,
                        step: 1,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="כמות מקסימלית"
                      type="number"
                      value={formValues.maxQuantity}
                      onChange={(event) => handleFieldChange('maxQuantity', event.target.value)}
                      inputProps={{
                        min: 1,
                        step: 1,
                      }}
                      helperText="השאירו ריק אם אין הגבלה"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Activation */}
              <Box>
                <Typography variant="h6" fontWeight={700} dir="ltr" textAlign="left" gutterBottom>
                  סטטוס המוצר
                </Typography>

                <FormControlLabel
                  sx={{
                    display: 'flex',
                    flexDirection: 'row-reverse',
                    justifyContent: 'flex-start',
                    ml: 0,
                    mr: 0,
                  }}
                  control={
                    <Switch
                      checked={formValues.isActive}
                      onChange={(event) => handleFieldChange('isActive', event.target.checked)}
                    />
                  }
                  label={
                    formValues.isActive
                      ? 'המוצר פעיל וזמין להזמנה'
                      : 'המוצר לא פעיל ואינו זמין להזמנה'
                  }
                />

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                    direction: 'ltr',
                    textAlign: 'left',
                  }}
                >
                  מוצרים לא פעילים עדיין מוצגים למנהלים וניתנים לעריכה.
                </Typography>
              </Box>

              <Divider />

              {/* Validation and API errors */}
              {validationError && <Alert severity="error">{validationError}</Alert>}

              {updateMutation.isError && (
                <Alert severity="error">
                  {updateMutation.error instanceof Error
                    ? updateMutation.error.message
                    : 'אירעה שגיאה בשמירת המוצר'}
                </Alert>
              )}

              {saveSuccess && <Alert severity="success">פרטי המוצר עודכנו בהצלחה.</Alert>}

              {/* Actions */}
              <Stack direction="row-reverse" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={() => navigate('/')}
                  disabled={updateMutation.isPending}
                >
                  חזרה לקטלוג
                </Button>

                <Button
                  type="submit"
                  variant="contained"
                  startIcon={
                    updateMutation.isPending ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <SaveIcon />
                    )
                  }
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'שומר שינויים...' : 'שמירת שינויים'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
