import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import type { ContactItem, CreateOrderInput, Order } from 'shared-types';

import { apiFetch } from '../../services/api';
import { checkoutCart } from '../../services/api/cart.service';
import { searchContacts } from '../../services/api/directory.service';
import { useAuthStore } from '../../store/useAuthStore';

export interface CheckoutFormValues {
  customer: {
    name: string;
    phone: string;
    orgEmail: string;
    unit: string;
  };
  budgetOfficer: {
    fullName: string;
    militaryEmail: string;
  };
  notes?: string;
}

// Checkout flow for requester details, budget approval, and optional notes.
const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().min(2, 'שם המזמין הוא שדה חובה'),
    phone: z.string().min(9, 'מספר הטלפון חייב להכיל לפחות 9 תווים'),
    orgEmail: z.string().email('מייל ארגוני לא תקין'),
    unit: z.string().min(1, 'יחידה היא שדה חובה'),
  }),
  budgetOfficer: z.object({
    fullName: z.string().min(2, 'שם קצין התקציב הוא שדה חובה'),
    militaryEmail: z
      .string()
      .email('מייל צבאי לא תקין')
      .refine((value) => /(?:\.mil$|\.idf\.il$|idf)/i.test(value), {
        message: 'יש להזין מייל צבאי תקין',
      }),
  }),
  notes: z.string().optional(),
});

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);

  // Fetch the authenticated requester profile so the form can be pre-filled with current user data.
  const {
    data: userProfile,
    isLoading: isLoadingUser,
    isError: isUserError,
  } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const response = await apiFetch('/api/auth/me');
      if (!response.ok) {
        throw new Error('Failed to load user profile');
      }
      return response.json();
    },
  });

  const defaultValues = useMemo<CheckoutFormValues>(() => {
    const resolvedUser = userProfile ?? {
      fullName: currentUser.name,
      militaryEmail: currentUser.email,
      unit: currentUser.unit ?? '',
      phone: '',
    };

    return {
      customer: {
        name: resolvedUser.fullName || currentUser.name,
        phone: resolvedUser.phone || '',
        orgEmail: resolvedUser.militaryEmail || currentUser.email,
        unit: resolvedUser.unit || currentUser.unit || '',
      },
      budgetOfficer: {
        fullName: '',
        militaryEmail: '',
      },
      notes: '',
    };
  }, [currentUser, userProfile]);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  // Directory contact search state for Budget Officer
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContactItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearchDirectory = async () => {
    const clean = directoryQuery.trim();
    if (clean.length < 2) {
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const contacts = await searchContacts(clean);
      setSearchResults(contacts.slice(0, 15));
      setHasSearched(true);
    } catch {
      setSearchError('שגיאה בחיפוש בספר הכתובות. נסה שוב.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectContact = (contact: ContactItem) => {
    setValue('budgetOfficer.fullName', contact.displayName, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('budgetOfficer.militaryEmail', contact.email, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // Submit the order payload to the backend and redirect to the confirmation page on success.
  const submitMutation = useMutation<Order, Error, CheckoutFormValues>({
    mutationFn: async (values: CheckoutFormValues) => {
      const payload: CreateOrderInput = {
        customer: values.customer,
        budgetOfficer: values.budgetOfficer,
        notes: values.notes ?? '',
      };

      return checkoutCart(payload);
    },
    onSuccess: (order: Order) => {
      navigate('/checkout/success', {
        state: {
          orderNumber: order.orderNumber,
        },
      });
    },
  });

  const onSubmit = (values: CheckoutFormValues) => {
    submitMutation.mutate(values);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      <Card sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, boxShadow: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          קופה ופרטי מזמין
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          כאן יוזנו פרטי המזמין ופרטי קצין התקציב לאישור.
        </Typography>

        {isLoadingUser ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : isUserError ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            לא הצלחנו לטעון את פרטי המשתמש. ניתן להמשיך ולהזין את הנתונים ידנית.
          </Alert>
        ) : null}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Card variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              1. פרטי המזמין
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="שם מלא"
                  fullWidth
                  dir="rtl"
                  error={Boolean(errors.customer?.name)}
                  helperText={errors.customer?.name?.message || ' '}
                  {...register('customer.name')}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="מייל ארגוני"
                  fullWidth
                  dir="rtl"
                  type="email"
                  error={Boolean(errors.customer?.orgEmail)}
                  helperText={errors.customer?.orgEmail?.message || ' '}
                  {...register('customer.orgEmail')}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="טלפון"
                  fullWidth
                  dir="rtl"
                  error={Boolean(errors.customer?.phone)}
                  helperText={errors.customer?.phone?.message || ' '}
                  {...register('customer.phone')}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="יחידה"
                  fullWidth
                  dir="rtl"
                  error={Boolean(errors.customer?.unit)}
                  helperText={errors.customer?.unit?.message || ' '}
                  {...register('customer.unit')}
                />
              </Grid>
            </Grid>
          </Card>

          <Card variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              2. פרטי קצין תקציב מאשר
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="שם מלא"
                  fullWidth
                  dir="rtl"
                  disabled={isSubmitting}
                  error={Boolean(errors.budgetOfficer?.fullName)}
                  helperText={errors.budgetOfficer?.fullName?.message || ' '}
                  {...register('budgetOfficer.fullName')}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="מייל צבאי"
                  fullWidth
                  dir="rtl"
                  type="email"
                  disabled={isSubmitting}
                  error={Boolean(errors.budgetOfficer?.militaryEmail)}
                  helperText={errors.budgetOfficer?.militaryEmail?.message || ' '}
                  {...register('budgetOfficer.militaryEmail')}
                />
              </Grid>
            </Grid>

            {/* Dedicated Directory Search Section */}
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                חיפוש בספר הכתובות של הארגון (Outlook)
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1.5 }}
              >
                הזן לפחות 2 אותיות משם הקצין ולחץ על &quot;חיפוש&quot; לבחירה מרשימת אנשי הקשר
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  size="small"
                  label="חיפוש קצין תקציב"
                  placeholder="הקלד שם לחיפוש..."
                  value={directoryQuery}
                  onChange={(e) => setDirectoryQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchDirectory();
                    }
                  }}
                  disabled={isSubmitting || isSearching}
                  sx={{ flexGrow: 1 }}
                  dir="rtl"
                  helperText={
                    directoryQuery.trim().length > 0 && directoryQuery.trim().length < 2
                      ? 'יש להזין לפחות 2 תווים כדי לחפש'
                      : ' '
                  }
                />
                <Button
                  variant="contained"
                  onClick={handleSearchDirectory}
                  disabled={directoryQuery.trim().length < 2 || isSearching || isSubmitting}
                  startIcon={
                    isSearching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />
                  }
                  sx={{ height: 40, px: 3, whiteSpace: 'nowrap' }}
                >
                  {isSearching ? 'מחפש...' : 'חיפוש'}
                </Button>
              </Box>

              {searchError && (
                <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
                  {searchError}
                </Alert>
              )}

              {hasSearched && (
                <Paper
                  variant="outlined"
                  sx={{
                    mt: 1.5,
                    maxHeight: 220,
                    overflowY: 'auto',
                    borderRadius: 2,
                    bgcolor: 'background.default',
                  }}
                >
                  {searchResults.length === 0 ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ p: 2, textAlign: 'center' }}
                    >
                      לא נמצאו אנשי קשר התואמים לחיפוש עבור &quot;{directoryQuery.trim()}&quot;
                    </Typography>
                  ) : (
                    <List dense disablePadding>
                      {searchResults.map((contact, index) => (
                        <React.Fragment key={`${contact.email}-${index}`}>
                          {index > 0 && <Divider component="li" />}
                          <ListItem disablePadding>
                            <ListItemButton
                              onClick={() => handleSelectContact(contact)}
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                py: 1,
                                px: 2,
                                '&:hover': { bgcolor: 'action.hover' },
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  width: '100%',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {contact.displayName}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'primary.main', fontWeight: 600 }}
                                >
                                  בחר איש קשר ↵
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {contact.email}
                                {contact.department ? ` • ${contact.department}` : ''}
                                {contact.title ? ` (${contact.title})` : ''}
                              </Typography>
                            </ListItemButton>
                          </ListItem>
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Paper>
              )}
            </Box>
          </Card>

          <Card variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              3. הערות נוספות
            </Typography>

            <TextField
              label="הערות מיוחדות לבית הדפוס"
              fullWidth
              dir="rtl"
              multiline
              minRows={4}
              placeholder="הערות, הוראות מיוחדות, מפגש, עיצוב, או פירוט נוסף..."
              {...register('notes')}
            />
          </Card>

          {submitMutation.isError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(submitMutation.error as Error).message || 'אירעה שגיאה בשליחת ההזמנה'}
            </Alert>
          ) : null}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={() => navigate('/cart')} disabled={isSubmitting}>
              חזרה לעגלה
            </Button>
            <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
              {isSubmitting ? 'שולח...' : 'שלח לאישור תקציבי'}
            </Button>
          </Box>
        </Box>
      </Card>
    </Container>
  );
};

export default CheckoutPage;
