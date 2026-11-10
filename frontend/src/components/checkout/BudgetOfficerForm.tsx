import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Grid, TextField, Typography } from '@mui/material';

import type { CheckoutFormValues } from '../../pages/checkout/CheckoutPage';

interface BudgetOfficerFormProps {
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
  disabled?: boolean;
}

// Budget officer section used in the approval workflow and validation flow.
export default function BudgetOfficerForm({
  register,
  errors,
  disabled = false,
}: BudgetOfficerFormProps) {
  return (
    <>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        2. פרטי קצין תקציב מאשר
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label="שם מלא"
            fullWidth
            dir="rtl"
            disabled={disabled}
            error={Boolean(errors.budgetOfficer?.fullName)}
            helperText={errors.budgetOfficer?.fullName?.message || ' '}
            {...register('budgetOfficer.fullName')}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="מספר אישי מנהל תקציב"
            fullWidth
            dir="rtl"
            placeholder="לדוגמה: 1234567"
            disabled={disabled}
            error={Boolean(errors.budgetOfficer?.militaryEmail)}
            helperText={errors.budgetOfficer?.militaryEmail?.message || ' '}
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]{7,8}',
              minLength: 7,
              maxLength: 8,
            }}
            sx={{
              '& .MuiInputBase-input': {
                textAlign: 'left',
                direction: 'ltr',
              },
            }}
            {...register('budgetOfficer.militaryEmail')}
          />
        </Grid>
      </Grid>
    </>
  );
}
