import { Request, Response } from 'express';

// טיפוס דמו למוצר (בהמשך יוחלף על ידי Prisma / ORM)
interface Product {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  attributes?: Record<string, unknown>; // 👈 תוקן מ-any ל-unknown!
}

// נתוני מוק זמניים לצורך בדיקה
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'חוברת כרוכה A4',
    category: 'booklets',
    isActive: true,
    attributes: { paperWeight: '135g' },
  },
  {
    id: '2',
    name: 'פוסטר 70x100',
    category: 'posters',
    isActive: true,
    attributes: { finish: 'glossy' },
  },
  { id: '3', name: 'מוצר ישן שנמחק', category: 'posters', isActive: false },
];

/**
 * GET /api/products
 * שליפת רשימת מוצרים פעילים (כולל אפשרות סינון לפי קטגוריה)
 */
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;

    // מחזירים רק מוצרים פעילים (Soft Delete check)
    let activeProducts = mockProducts.filter((p) => p.isActive);

    // אם נשלחה קטגוריה ב-Query Params -> מסננים לפיה
    if (category) {
      activeProducts = activeProducts.filter(
        (p) => p.category.toLowerCase() === String(category).toLowerCase()
      );
    }

    res.status(200).json({
      success: true,
      data: activeProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'שגיאת שרת פנימית' });
  }
};

/**
 * GET /api/products/:id
 * שליפת פרטי מוצר בודד
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = mockProducts.find((p) => p.id === id && p.isActive);

    if (!product) {
      res.status(404).json({ success: false, message: 'המוצר לא נמצא' });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'שגיאת שרת פנימית' });
  }
};

/**
 * POST /api/admin/products
 * יצירת מוצר חדש (מוגן למנהל)
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, attributes } = req.body;

    if (!name || !category) {
      res.status(400).json({ success: false, message: 'שם מוצר וקטגוריה הם שדות חובה' });
      return;
    }

    const newProduct: Product = {
      id: String(Date.now()),
      name,
      category,
      attributes: (attributes as Record<string, unknown>) || {},
      isActive: true,
    };

    mockProducts.push(newProduct);

    res.status(201).json({
      success: true,
      message: 'המוצר נוצר בהצלחה',
      data: newProduct,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'שגיאת שרת פנימית' });
  }
};

/**
 * PUT /api/admin/products/:id
 * עדכון מוצר קיים (מוגן למנהל)
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const productIndex = mockProducts.findIndex((p) => p.id === id && p.isActive);

    if (productIndex === -1) {
      res.status(404).json({ success: false, message: 'המוצר לעדכון לא נמצא' });
      return;
    }

    // עדכון השדות שהתקבלו ב-body
    mockProducts[productIndex] = {
      ...mockProducts[productIndex],
      ...req.body,
    };

    res.status(200).json({
      success: true,
      message: 'המוצר עודכן בהצלחה',
      data: mockProducts[productIndex],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'שגיאת שרת פנימית' });
  }
};

/**
 * DELETE /api/admin/products/:id
 * מחיקת מוצר (Soft Delete - הפיכה ל-isActive: false)
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = mockProducts.find((p) => p.id === id && p.isActive);

    if (!product) {
      res.status(404).json({ success: false, message: 'המוצר למחיקה לא נמצא' });
      return;
    }

    // ביצוע Soft Delete בלבד
    product.isActive = false;

    res.status(200).json({
      success: true,
      message: 'המוצר הוסר בהצלחה (Soft Delete)',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'שגיאת שרת פנימית' });
  }
};
