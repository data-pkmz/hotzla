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
  notes?: string;
}

/**
 * Safe error message shown when checkout fails.
 *
 * Internal database errors, stack traces, and other implementation
 * details must not be exposed to the requester.
 */
const CHECKOUT_ERROR_MESSAGE =
  'לא ניתן להשלים את ההזמנה כרגע. אנא נסה שוב. אם הבעיה נמשכת, פנה לתמיכה.';

/**
 * Validates requester details, budget officer information,
 * and optional notes before submitting the order.
 */
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

/**
 * Checkout page for submitting an order for budget approval.
 *
 * Responsibilities:
 * - Load the authenticated requester's profile.
 * - Pre-fill available requester information.
 * - Allow requester details to be edited.
 * - Collect budget officer information.
 * - Validate the checkout form.
 * - Prevent duplicate submissions.
 * - Submit the order through the cart service.
 * - Redirect after successful order creation.
 * - Display safe messages when checkout fails.
 */
export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);

  /**
   * Fetch the authenticated requester's profile.
   *
   * When available, these details populate the customer fields.
   * The fields remain editable.
   */
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

  /**
   * Prepare the checkout form's initial values.
   *
   * Requester fields are populated from the authenticated user.
   * Budget officer details and optional notes start empty.
   */
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

  /**
   * Synchronize the form when profile information finishes loading.
   *
   * keepDirtyValues ensures that fields the requester has already
   * modified are not overwritten by the loaded profile.
   */
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    reset(defaultValues, {
      keepDirtyValues: true,
    });
  }, [defaultValues, reset]);

  /**
   * Submit the validated order to the backend.
   *
   * The backend remains responsible for authoritative pricing
   * and creating the order.
   */
  const submitMutation = useMutation<Order, Error, CheckoutFormValues>({
    mutationFn: async (values: CheckoutFormValues) => {
      const payload: CreateOrderInput = {
        customer: values.customer,
        budgetOfficer: values.budgetOfficer,
        notes: values.notes ?? '',
      };

      return checkoutCart(payload);
    },

    /**
     * Redirect only after the order has been successfully created.
     */
    onSuccess: (order: Order) => {
      navigate('/checkout/success', {
        state: {
          orderNumber: order.orderNumber,
        },
      });
    },
  });

  /**
   * Prevent edits and additional submissions during checkout.
   */
  const isCheckoutPending = isSubmitting || submitMutation.isPending;

  /**
   * Handles checkout submission.
   *
   * The synchronous guard prevents rapid double submissions.
   * Failed requests remain on this page and display a safe error.
   */
  const onSubmit = async (values: CheckoutFormValues) => {
    if (submitMutation.isPending) {
      return;
    }

    try {
      await submitMutation.mutateAsync(values);
    } catch {
      // The mutation retains its error state.
      // A safe error message is displayed below.
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} dir="rtl">
      <Card
        sx={{
          p: {
            xs: 2,
            md: 4,
          },
          borderRadius: 3,
          boxShadow: 3,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            mb: 1,
          }}
        >
          קופה ופרטי מזמין
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          כאן יוזנו פרטי המזמין ופרטי קצין התקציב לאישור.
        </Typography>

        {/* Profile loading and fallback feedback */}
        {isLoadingUser ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 4,
            }}
          >
            <CircularProgress />
          </Box>
        ) : isUserError ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            לא הצלחנו לטעון את פרטי המשתמש. ניתן להמשיך ולהזין את הנתונים ידנית.
          </Alert>
        ) : null}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* -------------------------------------- */}
          {/* 1. Requester details                    */}
          {/* -------------------------------------- */}

          <Card
            variant="outlined"
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                mb: 2,
              }}
            >
              1. פרטי המזמין
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="שם מלא"
                  fullWidth
                  dir="rtl"
                  disabled={isCheckoutPending}
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
                  disabled={isCheckoutPending}
                  error={Boolean(errors.customer?.orgEmail)}
                  helperText={errors.customer?.orgEmail?.message || ' '}
                  {...register('customer.orgEmail')}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="טלפון"
                  fullWidth
                  type="tel"
                  InputLabelProps={{ shrink: true }}
                  disabled={isCheckoutPending}
                  error={Boolean(errors.customer?.phone)}
                  helperText={errors.customer?.phone?.message || ' '}
                  sx={{
                    '& .MuiInputBase-input': {
                      textAlign: 'left',
                      direction: 'ltr',
                    },
                  }}
                  {...register('customer.phone')}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="יחידה"
                  fullWidth
                  dir="rtl"
                  disabled={isCheckoutPending}
                  error={Boolean(errors.customer?.unit)}
                  helperText={errors.customer?.unit?.message || ' '}
                  {...register('customer.unit')}
                />
              </Grid>
            </Grid>
          </Card>

          {/* -------------------------------------- */}
          {/* 2. Budget officer details               */}
          {/* -------------------------------------- */}

          <Card
            variant="outlined"
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
            }}
          >
            <BudgetOfficerForm register={register} errors={errors} disabled={isCheckoutPending} />
          </Card>

          {/* -------------------------------------- */}
          {/* 3. Additional notes                     */}
          {/* -------------------------------------- */}

          <Card
            variant="outlined"
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                mb: 2,
              }}
            >
              3. הערות נוספות
            </Typography>

            <TextField
              label="הערות מיוחדות לבית הדפוס"
              fullWidth
              dir="rtl"
              multiline
              minRows={4}
              disabled={isCheckoutPending}
              placeholder="הערות, הוראות מיוחדות, מפגש, עיצוב, או פירוט נוסף..."
              {...register('notes')}
            />
          </Card>

          {/* -------------------------------------- */}
          {/* Checkout error                         */}
          {/* -------------------------------------- */}

          {submitMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {CHECKOUT_ERROR_MESSAGE}
            </Alert>
          )}

          <Divider sx={{ my: 3 }} />

          {/* -------------------------------------- */}
          {/* Checkout actions                       */}
          {/* -------------------------------------- */}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="outlined"
              onClick={() => navigate('/cart')}
              disabled={isCheckoutPending}
            >
              חזרה לעגלה
            </Button>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isCheckoutPending}
              startIcon={
                isCheckoutPending ? <CircularProgress size={18} color="inherit" /> : undefined
              }
            >
              {isCheckoutPending ? 'שולח...' : 'שלח לאישור תקציבי'}
            </Button>
          </Box>
        </Box>
      </Card>
    </Container>
  );
};

export default CheckoutPage;
