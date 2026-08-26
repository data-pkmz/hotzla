import { Request, Response } from 'express';

export class CartController {
  // GET /api/cart – שליפת העגלה הפעילה של המשתמש
  static async getActiveCart(_req: Request, res: Response) {
    try {
      // TODO: שליפת העגלה מה-DB
      return res.status(200).json({ message: 'העגלה נשלפה בהצלחה', cart: {} });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: errorMessage });
    }
  }

  // POST /api/cart/items – הוספת פריט לעגלה
  static async addItem(req: Request, res: Response) {
    try {
      const itemData = req.body;
      // TODO: הוספת פריט לעגלה ב-DB
      return res.status(201).json({ message: 'הפריט נוסף בהצלחה', item: itemData });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: errorMessage });
    }
  }

  // DELETE /api/cart/items/:id – הסרת פריט
  static async removeItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // TODO: הסרת פריט מהעגלה לפי מזהה
      return res.status(200).json({ message: `הפריט ${id} הוסר בהצלחה` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: errorMessage });
    }
  }
}
