# מערכת "הוצאה לאור דיגיטלית"

מערכת ה-DPS מחליפה את התהליך הידני של הזמנת חומרי דפוס מול בית הדפוס הארגוני (הוצל"א) של פיקוד מרכז בממשק דיגיטלי מלא, הכולל קטלוג מוצרים, מנוע תמחור אוטומטי, ושרשרת אישורים דיגיטלית.

פרויקט זה מנוהל כ-**Monorepo** מבוסס **npm workspaces** ומחולק לשלושה חלקים מרכזיים.

---

## תיעוד ואפיון המערכת

- **[מסמך אפיון המערכת המלא (DPS_SDD)](./DPS_SDD.md)**
- **[פירוט משימות מורחב לפיתוח (DPS_Detailed_Task_Breakdown)](./DPS_Detailed_Task_Breakdown.md)**
- **[תיעוד תשתיות וסביבות עבודה (Infrastructure Setup)](./docs/infrastructure-setup.md)**
- **[תיעוד אימות זהות (IWA & Mock Auth)](./docs/iwa-configuration.md)**

---

## מבנה התיקיות והחבילות (Monorepo Workspaces)

```text
hotzla_v0/
├── shared-types/     # חבילת טיפוסים משותפת (TypeScript definitions)
├── backend/          # שרת ה-API (Node.js + Express + TypeScript + Prisma ORM)
├── frontend/         # אפליקציית הלקוח (React 18 + TS + Vite + Material UI)
├── infra/            # קונפיגורציות תשתית (Nginx reverse proxy)
├── docs/             # תיעוד ארכיטקטורה ותשתיות
├── docker-compose.yml # הרצת PostgreSQL ו-Nginx מקומיים
├── package.json      # קובץ הגדרת workspaces וסקריפטים גלובליים
└── tsconfig.json     # הגדרות TypeScript כלליות
```

---

## מדריך להתקנה, הרצה ובדיקות

### 1. דרישות קדם

- **Node.js**: גרסה `20.x` או `22.x` LTS.
- **npm**: גרסה `9` ומעלה (התומכת ב-workspaces).
- **Docker Desktop**: להרצת מסד הנתונים PostgreSQL ו-Nginx.

---

### 2. התקנת תלויות וקישור חבילות

משורש הפרויקט (Root), הרץ:

```bash
npm install
```

---

### 3. הגדרת משתני סביבה

1. העתק את קובץ הדוגמה בשורש הפרויקט:
   ```bash
   cp .env.example .env
   ```
2. העתק את קובץ הדוגמה ב-Frontend:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
3. העתק את קובץ הדוגמה ב-Backend:
   ```bash
   cp backend/.env.example backend/.env
   ```

---

### 4. הקמת מסד נתונים PostgreSQL ו-Prisma Migrations

#### א. הרצת PostgreSQL ב-Docker

הרם את מסד הנתונים ו-Nginx בסביבה המקומית:

```bash
docker-compose up -d
```

- מסד הנתונים זמין בכתובת `localhost:5433` (שם משתמש: `hotzla_user`, סיסמה: `hotzla_password`, DB: `hotzla_db`).

#### ב. הרצת Migrations וחלוקת סכימה

משורש הפרויקט, הרץ את הסקריפט ליצירת הלקוח של Prisma והחלת הטבלאות ב-DB:

```bash
npm run prisma:generate
npx prisma migrate dev --schema=backend/prisma/schema.prisma
```

#### ג. אכלוס נתוני דמו (Database Seeding)

להזנת מוצרי דפוס ראשוניים (כרטיסי ביקור, חוברות, רול-אפים, נייר מכתבים) ומפרטים דינמיים:

```bash
npx prisma db seed --schema=backend/prisma/schema.prisma
```

---

### 5. הרצת המערכת במצב פיתוח (Local Development)

#### א. הרצת כל השירותים במקביל

משורש הפרויקט ניתן להריץ את שרתי הפיתוח במקביל:

```bash
npm run dev:backend   # מאזין בפורט 3001
npm run dev:frontend  # מאזין בפורט 5173 (עם Proxy שקוף ל-3001)
```

#### ב. גישה לאפליקציה בדפדפן

- **דרך Nginx Proxy**: `http://localhost:8080`
- **דרך Vite Dev Server**: `http://localhost:5173`
- **שרת ה-API**: `http://localhost:3001/api`

---

### 6. בדיקות איכות קוד

המערכת כוללת בדיקות אוטומטיות מלאות לכל השכבות:

#### א. הרצת בדיקות יחידה

הרצת כל בדיקות היחידה (מנוע תמחור, קטלוג, עגלת קניות, AuthService, AuditLog):

```bash
npm test
```

#### ב. בדיקת תקינות טיפוסים

בדיקת קומפילציה מלאה ללא פליטת קבצים בכל 3 ה-workspaces:

```bash
npm run type-check
```

#### ג. בדיקת ESLint (Zero Warnings)

הרצת בדיקת לינט קשיחה (אפס אזהרות מותרות):

```bash
npm run lint
```

#### ד. בדיקת עיצוב Prettier

```bash
npm run format:check
```

#### ה. הרצת בדיקה מאוחדת (CI Local Runner)

להרצת כל שלבי הבדיקות ברצף (זהה ל-CI Pipeline ב-GitHub Actions):

```bash
npm run ci:local
```

---

## 🛠️ סקריפטים מרכזיים ב-package.json

| פקודה                  | תיאור                                       |
| :--------------------- | :------------------------------------------ |
| `npm run dev:backend`  | הרצת שרת ה-Backend במצב פיתוח (ts-node-dev) |
| `npm run dev:frontend` | הרצת ה-Frontend במצב פיתוח (Vite)           |
| `npm run build`        | בנייה מלאה לכל ה-workspaces                 |
| `npm test`             | הרצת כל בדיקות היחידה בפרויקט               |
| `npm run type-check`   | בדיקת סוגי TypeScript ללא שגיאות            |
| `npm run lint`         | הרצת ESLint על כל הריפו                     |
| `npm run format`       | עיצוב קוד אוטומטי בעזרת Prettier            |
