import { z } from 'zod';

export const checkoutSchema = z.object({
  requesterId: z.string().uuid('מזהה מזמין לא תקין').optional(),

  cartId: z.string().uuid('מזהה עגלה לא תקין').optional(),

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
      .refine(
        (val) => {
          const isMilitaryEmail =
            val.endsWith('.mil') || val.endsWith('.idf.il') || val.includes('idf');

          const isAllowedTestEmail =
            process.env.NODE_ENV !== 'production' && val === process.env.LOAD_TEST_EMAIL;

          return isMilitaryEmail || isAllowedTestEmail;
        },
        {
          message: 'יש להזין מייל צבאי תקין',
        }
      ),
  }),

  deliveryDueDate: z.string().min(1, 'תאריך יעד מבוקש לאספקה הוא שדה חובה'),

  notes: z.string().optional(),
});
