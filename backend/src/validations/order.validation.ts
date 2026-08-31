import { z } from 'zod';

export const checkoutSchema = z.object({
  requesterId: z.string().uuid('מזהה מזמין לא תקין').optional(), // Handled by backend auth
  cartId: z.string().uuid('מזהה עגלה לא תקין').optional(), // Handled by backend service
  customer: z.object({
    name: z.string().min(2, 'שם מזמין הוא שדה חובה'),
    phone: z.string().min(9, 'מספר טלפון לא תקין'),
    orgEmail: z.string().email('מייל ארגוני לא תקין'),
    unit: z.string().min(1, 'יחידה היא שדה חובה'),
  }),
  budgetOfficer: z.object({
    fullName: z.string().min(2, 'שם מלא של קצין תקציב הוא שדה חובה'),
    militaryEmail: z
      .string()
      .email('מייל צבאי לא תקין')
      .refine((val) => val.endsWith('.mil') || val.endsWith('.idf.il') || val.includes('idf'), {
        message: 'יש להזין מייל צבאי תקין',
      }),
  }),
  deliveryDueDate: z.string().min(1, 'תאריך יעד מבוקש לאספקה הוא שדה חובה'),
  notes: z.string().optional(),
});
