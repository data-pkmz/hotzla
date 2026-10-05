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
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import type { CreateOrderInput, Order } from 'shared-types';

import BudgetOfficerForm from '../../components/checkout/BudgetOfficerForm';
import { apiFetch } from '../../services/api';
import { checkoutCart } from '../../services/api/cart.service';
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
  deliveryDueDate: string;
  notes?: string;
}

// Checkout flow for requester details, budget approval, and delivery requirements.
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
  deliveryDueDate: z.string().min(1, 'יש להזין תאריך מבוקש'),
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
      deliveryDueDate: '',
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
    formState: { errors, isSubmitting },
  } = form;

  // Submit the order payload to the backend and redirect to the confirmation page on success.
  const submitMutation = useMutation<Order, Error, CheckoutFormValues>({
    mutationFn: async (values: CheckoutFormValues) => {
      const payload: CreateOrderInput = {
        customer: values.customer,
        budgetOfficer: values.budgetOfficer,
        deliveryDueDate: values.deliveryDueDate,
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
            <BudgetOfficerForm register={register} errors={errors} disabled={isSubmitting} />
          </Card>

          <Card variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              3. פרטי אספקה
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="תאריך מבוקש"
                  fullWidth
                  dir="rtl"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(errors.deliveryDueDate)}
                  helperText={errors.deliveryDueDate?.message || ' '}
                  {...register('deliveryDueDate')}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="הערות מיוחדות לבית הדפוס"
                  fullWidth
                  dir="rtl"
                  multiline
                  minRows={4}
                  placeholder="הערות, הוראות מיוחדות, מפגש, עיצוב, או פירוט נוסף..."
                  {...register('notes')}
                />
              </Grid>
            </Grid>
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
