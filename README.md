## הוראות הרצה ופיתוח מקומי

### 1. דרישות קדם (Prerequisites)

לפני הרצת הפרויקט יש לוודא שמותקנים במחשב:

- **Node.js**
- **npm** עם תמיכה ב-Workspaces
- **Docker Desktop** – נדרש להרצת שירותי התשתית באמצעות Docker Compose

---

### 2. התקנת תלויות

בהרצה ראשונה של הפרויקט על מחשב חדש, יש להריץ משורש הפרויקט:

```bash
npm install
```

פקודה זו מתקינה את התלויות עבור כל חבילות ה-Monorepo ומקשרת בין ה-Workspaces.

---

### 3. בניית `shared-types`

בהרצה ראשונה של הפרויקט, או לאחר שינוי בטיפוסים המשותפים, יש לבנות את חבילת `shared-types`:

```bash
npm run build:shared
```

ה-Frontend וה-Backend משתמשים בחבילה זו כמקור אמת משותף עבור טיפוסי TypeScript, ולכן יש לוודא שהיא בנויה לפני הרצת המערכת.

**[למעבר למסמך האפיון המלא - DPS_SDD](./DPS_SDD.md)**
---

### 4. הפעלת שירותי התשתית

יש לוודא ש-Docker Desktop פועל ולאחר מכן להריץ משורש הפרויקט:

```bash
docker compose up
```

Docker Compose מפעיל את שירותי התשתית הנדרשים לפיתוח המקומי, כולל:

- **PostgreSQL** – מסד הנתונים של המערכת.
- **Nginx** – Reverse Proxy המשמש כנקודת הכניסה למערכת.

Nginx מאזין בפורט `8080` ומנתב את הבקשות אל ה-Frontend וה-Backend.

---

### 5. הכנת מסד הנתונים

בהרצה ראשונה יש לוודא שמסד הנתונים מאותחל ומכיל את נתוני הפיתוח הנדרשים.

יש להריץ את ה-Seed של Prisma:

```bash
npm run db:seed
```

> יש להוסיף את הסקריפט `db:seed` ל-`package.json` בהתאם לפקודת ה-Seed המוגדרת בפרויקט.

יש צורך לבצע Seed בעיקר בהרצה ראשונה, לאחר איפוס מסד הנתונים, או כאשר נתוני ה-Seed השתנו.

---

### 6. הרצת ה-Backend

בטרמינל נפרד, משורש הפרויקט:

```bash
npm run dev:backend
```

שרת ה-Backend מבוסס Express ומאזין כברירת מחדל בפורט:

```text
3001
```

---

### 7. הרצת ה-Frontend

בטרמינל נוסף, משורש הפרויקט:

```bash
npm run dev:frontend
```

שרת הפיתוח של Vite מאזין כברירת מחדל בפורט:

```text
5173
```

---

### 8. פתיחת המערכת בדפדפן

לאחר ש-Docker Compose, ה-Backend וה-Frontend פועלים, יש לפתוח את המערכת דרך Nginx בכתובת:

```text
http://localhost:8080
```

> **חשוב:** במהלך הפיתוח יש לגשת למערכת דרך פורט `8080` ולא ישירות דרך Vite בפורט `5173`.

זרימת הבקשות המקומית היא:

```text
Browser
   │
   ▼
Nginx :8080
   │
   ├── /       → Frontend :5173
   │
   └── /api/   → Backend :3001
```

כך סביבת הפיתוח המקומית עובדת דרך אותו Reverse Proxy ומאפשרת ל-Frontend לבצע קריאות API באמצעות נתיבים כגון:

```text
/api/products
/api/pricing/calculate
/api/auth/...
```

ללא צורך לפנות ישירות לפורט של ה-Backend.

---

## הרצה מהירה לאחר ההתקנה הראשונית

לאחר שהפרויקט כבר הותקן, `shared-types` נבנה ומסד הנתונים אותחל, בדרך כלל מספיק להפעיל שלושה תהליכים:

**טרמינל 1 – Docker:**

```bash
docker compose up
```

**טרמינל 2 – Backend:**

```bash
npm run dev:backend
```

**טרמינל 3 – Frontend:**

```bash
npm run dev:frontend
```

ולאחר מכן לפתוח:

```text
http://localhost:8080
```

---

## בנייה (Build)

לבניית הפרויקט:

```bash
npm run build
```

ניתן גם לבנות כל Workspace בנפרד:

```bash
npm run build:shared
npm run build:backend
npm run build:frontend
```

לאחר שינוי ב-`shared-types`, מומלץ להריץ לפחות:

```bash
npm run build:shared
```

לפני המשך הפיתוח.
