import { Request, Response } from 'express';
import { z } from 'zod';

// הגדרת סכמת ה-Zod ל-Checkout ישירות בקובץ (או ביבוא מקובץ וולידציה נפרד)
const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().min(2, "שם מזמין הוא שדה חובה"),
    phone: z.string().min(9, "מספר טלפון לא תקין"),
    orgEmail: z.string().email("מייל ארגוני לא תקין"),
    unit: z.string().min(1, "יחידה היא שדה חובה"),
  }),
  budgetOfficer: z.object({
    fullName: z.string().min(2, "שם מלא של קצין תקציב הוא שדה חובה"),
    militaryEmail: z.string().email("מייל צבאי לא תקין").refine(
      (val) => val.endsWith('.mil') || val.endsWith('.idf.il') || val.includes('idf'), 
      { message: "יש להזין מייל צבאי תקין" }
    ),
  }),
  deliveryDueDate: z.string().min(1, "תאריך יעד מבוקש לאספקה הוא שדה חובה"),
  notes: z.string().optional(),
});

export class OrderController {
  // POST /api/cart/checkout – ביצוע Checkout ויצירת הזמנה עם אכיפת Zod
  static async checkout(req: Request, res: Response) {
    try {
      // הפעלת הוולידציה של Zod על הנתונים שהתקבלו ב-Body
      const validationResult = checkoutSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          error: "שגיאה בנתוני ה-Checkout - חסרים או שגויים שדות חובה",
          details: validationResult.error.format(),
        });
      }

      const orderData = validationResult.data;

      // TODO: יצירת ההזמנה ב-DB וניקוי העגלה
      return res.status(201).json({
        message: "ההזמנה נוצרה בהצלחה",
        order: orderData,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}