# תיעוד תשתיות וסביבות עבודה – מערכת DPS

מסמך זה מתעד את סביבות העבודה, כתובות ה-IP, הגדרות הפורטים ותצורת ה-Docker עבור מערכת DPS.

## 🏗️ סביבות פיתוח וסביבות ריצה

המערכת פועלת ב-3 סביבות נפרדות:

| סביבה           | מטרת הסביבה     | קובץ Docker Compose          | פורט Nginx | פורט DB | מצב Auth       |
| :-------------- | :-------------- | :--------------------------- | :--------- | :------ | :------------- |
| **Development** | פיתוח מקומי     | `docker-compose.yml`         | 8080       | 5433    | `mock`         |
| **Staging**     | בדיקות ארגוניות | `docker-compose.staging.yml` | 80         | 5432    | `iwa` / `mock` |
| **Production**  | סביבת ייצור     | `docker-compose.prod.yml`    | 80 / 443   | 5432    | `iwa`          |

---

## 🚀 הרצת הסביבות ב-Docker

### 1. סביבת פיתוח (Dev)

```bash
docker-compose up -d
```

- **PostgreSQL**: נגיש ב-`localhost:5433` (משתמש: `hotzla_user`, סיסמה: `hotzla_password`, DB: `hotzla_db`).
- **Nginx Reverse Proxy**: נגיש ב-`http://localhost:8080`.

### 2. סביבת בדיקות (Staging)

```bash
docker-compose -f docker-compose.staging.yml up -d
```

### 3. סביבת ייצור (Production)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📂 נתיבי אחסון קבצים (Network File Storage)

לכל סביבה מוגדר נתיב אחסון קבצים נפרד לשמירת קבצים שהועלו ע"י המשתמשים:

- **Dev**: `./uploads/dev/`
- **Staging**: `\\network-share\dps-staging-uploads\`
- **Prod**: `\\network-share\dps-prod-uploads\`
