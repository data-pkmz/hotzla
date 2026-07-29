# מערכת "הוצאה לאור דיגיטלית" (Digital Publishing System – DPS)

מערכת ה-DPS מחליפה את התהליך הידני של הזמנת חומרי דפוס מול בית הדפוס הארגוני (הוצל"א) של פיקוד מרכז בממשק דיגיטלי מלא, הכולל קטלוג מוצרים, מנוע תמחור אוטומטי, ושרשרת אישורים דיגיטלית.

פרויקט זה מנוהל כ-**Monorepo** מבוסס **npm workspaces** ומחולק לשלושה חלקים מרכזיים.

---

## תיעוד ואפיון המערכת

כדי להבין לעומק את הדרישות העסקיות, מודל הנתונים, ותרשימי הזרימה המלאים של הפרויקט, יש לעיין במסמך האפיון המצורף לריפו זה. המסמך מכיל את ה-SDD המלא.

- **[למעבר למסמך האפיון המלא - DPS_SDD](./DPS_SDD.md)**

---

## מבנה התיקיות והחבילות (Monorepo Workspaces)

```text
hotzla_v0/
├── shared-types/     # חבילת טיפוסים משותפת (TypeScript definitions)
├── backend/          # שרת ה-API (Node.js + Express + TypeScript)
├── frontend/         # אפליקציית הלקוח (React 18 + TS + Vite + Material UI)
├── package.json      # קובץ הגדרת workspaces וסקריפטים גלובליים
└── tsconfig.json     # הגדרות TypeScript כלליות
```

### פירוט השכבות:

1.  **[shared-types](file:///c:/Users/Eli/Desktop/Projects/Hotzla/hotzla_v0/shared-types/)**: מכילה את כל ממשקי הנתונים והטיפוסים המשותפים (כגון `User`, `Order`, `Product`, `OrderStatus` ועוד). הן ה-Backend והן ה-Frontend מייבאים את הטיפוסים מחבילה זו כדי לשמור על מקור אמת יחיד (Single Source of Truth).
2.  **[backend](file:///c:/Users/Eli/Desktop/Projects/Hotzla/hotzla_v0/backend/)**: שרת API המבוסס על Express. התיקייה מאורגנת בצורה שכבתי: `config`, `controllers`, `routes`, `services`, `middlewares` ו-`repositories`.
3.  **[frontend](file:///c:/Users/Eli/Desktop/Projects/Hotzla/hotzla_v0/frontend/)**: אפליקציית React מוגדרת עם תמיכה מלאה ב-RTL וב-Material UI, וכוללת את שלד התיקיות הנדרש עבור ה-pages, components, stores (Zustand) ו-services (React Query).

---

## הוראות הרצה ופיתוח מקומי

### 1. דרישות קדם (Prerequisites)

- **Node.js**: גרסה 18 או 20 LTS.
- **npm**: גרסה 9 ומעלה (התומכת ב-workspaces).

### 2. התקנת תלויות וקישור חבילות

משורש הפרויקט (Root), הרץ את הפקודה הבאה כדי להתקין את כל התלויות עבור כל ה-workspaces וליצור את הקישורים ביניהם:

```bash
npm install
```

### 3. בנייה (Build)

לפני הרצת השרתים בפעם הראשונה או לאחר שינוי בטיפוסים המשותפים (`shared-types`), יש לבצע בנייה של החבילה המשותפת ושאר הפרויקטים על ידי הרצת הפקודה הבאה משורש הפרויקט:

```bash
npm run build
```

או לבניית חבילה ספציפית:

- בניית טיפוסים משותפים בלבד: `npm run build:shared`
- בניית צד השרת בלבד: `npm run build:backend`
- בניית צד הלקוח בלבד: `npm run build:frontend`

### 4. הרצה במצב פיתוח (Local Development)

ניתן להריץ את שרתי הפיתוח משורש הפרויקט:

- **הרצת ה-Backend** (מאזין בפורט `3001` כברירת מחדל):
  ```bash
  npm run dev:backend
  ```
- **הרצת ה-Frontend** (Vite Dev Server, מאזין בפורט `5173` כברירת מחדל):
  ```bash
  npm run dev:frontend
  ```
