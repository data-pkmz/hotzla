<div dir="rtl" style="text-align: right;">

# מסמך תכן תוכנה ותיעוד למפתחים (As-Built SDD & Developer Guide)

## מערכת "הוצאה לאור דיגיטלית" (Digital Publishing System – DPS / הוצל"א)

**גרסה:** 2.0 (תיעוד מצב קיים – As-Built למפתחים ממשיכים)
**סטטוס:** מערכת ממומשת ופעילה
**שפת פיתוח (Stack):** Monorepo (npm workspaces) – React 18 + Node.js 20 + Express + PostgreSQL 15 + Prisma 7 + TypeScript

---

## תוכן עניינים

1. [מבוא ורקע](#1-מבוא-ורקע)
2. [מטרות המערכת](#2-מטרות-המערכת)
3. [משתמשים, תפקידים והרשאות](#3-משתמשים-תפקידים-והרשאות)
4. [ארכיטקטורת מערכת – תמונה כללית (As-Built)](#4-ארכיטקטורת-מערכת--תמונה-כללית-as-built)
5. [Technology Stack](#5-technology-stack)
6. [מודל נתונים (ERD עדכני)](#6-מודל-נתונים-erd-עדכני)
7. [מנוע המוצר הדינמי (EAV Engine)](#7-מנוע-המוצר-הדינמי-eav-engine)
8. [מנוע תמחור (Pricing Engine)](#8-מנוע-תמחור-pricing-engine)
9. [מכונת מצבים – זרימת הזמנה ואישורים](#9-מכונת-מצבים--זרימת-הזמנה-ואישורים)
10. [אינטגרציית מייל ארגוני ו-Workers ברקע](#10-אינטגרציית-מייל-ארגוני-ו-workers-ברקע)
11. [שכבות קוד, Services ו-Workers (Backend)](#11-שכבות-קוד-services-ו-workers-backend)
12. [ארכיטקטורת Frontend וניווט](#12-ארכיטקטורת-frontend-וניווט)
13. [API Endpoints (מיפוי מלא מהקוד)](#13-api-endpoints-מיפוי-מלא-מהקוד)
14. [אימות, הרשאות וניהול תפקידים (Auth & RBAC)](#14-אימות-הרשאות-וניהול-תפקידים-auth--rbac)
15. [אבטחת מידע ודרישות לא פונקציונליות](#15-אבטחת-מידע-ודרישות-לא-פונקציונליות)
16. [מקרי קצה – מימוש טכני בפועל](#16-מקרי-קצה--מימוש-טכני-בפועל)
17. [מדריך למפתח חדש (Onboarding, הרצה ובדיקות)](#17-מדריך-למפתח-חדש-onboarding-הרצה-ובדיקות)
18. [נספחים](#18-נספחים)

---

## 1. מבוא ורקע

מערכת ה-DPS (הוצל"א) מחליפה תהליך ידני של הזמנת חומרי דפוס מול בית הדפוס הארגוני, שכלל שליחת מיילים חופשיים, המתנה להצעות מחיר ואישורים טלפוניים. המערכת מספקת קטלוג דיגיטלי (מוצרים קבועים ומוצרים דינמיים), מנוע תמחור אוטומטי בזמן אמת, זרימת אישורים דיגיטלית דו-שלבית (קצין תקציב + מנהל בית הדפוס), תור עבודה לעובדי הדפוס וממשק ניהול הרשאות וקטלוג.

### תרשים תהליך עסקי (High Level)

```mermaid
flowchart RL
    A["מזמין בוחר מוצר\nומגדיר מפרט / מעלה קובץ"] --> B["עגלת קניות + Checkout\n(הזנת מספר אישי מנהל תקציב)"]
    B --> C["PENDING_BUDGET\nשליחת מייל אוטומטי לקצין תקציב"]
    C --> D["קצין תקציב מאשר או דוחה\n(במענה למייל או בקישור טוקן מאובטח)"]
    D --> E["PENDING_MANAGER_APPROVAL\nמנהל בית הדפוס מאשר או דוחה לביצוע"]
    E --> F["APPROVED_FOR_PRODUCTION\nנכנס לתור העבודה של עובדי הדפוס"]
    F --> G["IN_PRODUCTION\nעובד בית הדפוס מתחיל הדפסה"]
    G --> H["READY_FOR_PICKUP\nמוכן לאיסוף + שליחת מייל למזמין"]
    H --> I["COMPLETED\nנמסר למזמין והושלם"]
```

---

## 2. מטרות המערכת

- ביטול תהליך ידני מבוסס מייל חופשי והצעות מחיר ידניות.
- תמחור אוטומטי ומיידי (כולל פירוט חישוב מלא – Price Breakdown) עבור מוצרים פשוטים ומוצרים מורכבים המוגדרים דינמית.
- שרשרת אישורים דיגיטלית חסינת כפילויות (Idempotent) עם נעילות שורה ב-DB (`SELECT ... FOR UPDATE`).
- תור עבודה ממוקד לעובדי בית הדפוס (`WorkerQueuePage`) ופאנל ניהול מלא למנהל.
- שקיפות מלאה למזמין לגבי מצב ההזמנה והיסטוריית השינויים (`OrderStatusHistory`).

---

## 3. משתמשים, תפקידים והרשאות

| תפקיד                          | סוג משתמש במערכת                            | תיאור                                                                                                                                                  |
| :----------------------------- | :------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **מזמין** (`REQUESTER`)        | משתמש רשום (Windows Integrated Auth / Mock) | צופה בקטלוג, מנהל עגלת קניות, יוצר הזמנות ועוקב אחר ההזמנות האישיות שלו בלבד.                                                                          |
| **קצין תקציב**                 | **לא משתמש רשום** – אינטראקציה חיצונית בלבד | מקבל מייל אישור תקציבי (`<prefix><id>@army.idf.il`), ומאשר/דוחה ע"י מענה למייל או לחיצה על קישור חד-פעמי מאובטח (`/approve-order?token=...`).          |
| **מנהל בית הדפוס** (`MANAGER`) | משתמש רשום, Role: `MANAGER`                 | הרשאות מלאות: ניהול קטלוג (בונה מוצר דינמי), אישור/דחייה ניהולית של הזמנות, כל פעולות הייצור של העובד, וניהול תפקידי משתמשים (`REQUESTER` ↔ `WORKER`). |
| **עובד בית הדפוס** (`WORKER`)  | משתמש רשום, Role: `WORKER`                  | צופה בתור העבודה ובהזמנות, מוריד קבצי הדפסה, ומעדכן סטטוסי ייצור (`IN_PRODUCTION`, `READY_FOR_PICKUP`, `COMPLETED`).                                   |

### מטריצת הרשאות (RBAC בפועל)

| פעולה                                                                  | מזמין (`REQUESTER`) | מנהל (`MANAGER`) | עובד (`WORKER`) |
| :--------------------------------------------------------------------- | :-----------------: | :--------------: | :-------------: |
| צפייה בקטלוג פעיל (`/api/products`)                                    |          ✔          |        ✔         |        ✔        |
| העלאת קבצים ושימוש בעגלת קניות (`/api/cart/*`)                         |          ✔          |        –         |        –        |
| יצירת הזמנה חדשה (`POST /api/cart/checkout`)                           |          ✔          |        –         |        –        |
| צפייה בהזמנות אישיות (`GET /api/orders/my-orders`)                     |          ✔          |        –         |        –        |
| צפייה בכל ההזמנות במערכת (`GET /api/orders`)                           |          –          |        ✔         |        ✔        |
| צפייה בפרטי הזמנה והיסטוריית סטטוסים (`GET /api/orders/:id`)           |  ✔ (רק הזמנות שלו)  |     ✔ (הכל)      |     ✔ (הכל)     |
| הורדת קובץ מצורף להזמנה (`GET /api/files/download`)                    |  ✔ (רק קבצים שלו)   |     ✔ (הכל)      |     ✔ (הכל)     |
| ניהול קטלוג מלא ובונה מוצר (`/api/admin/products/*`)                   |          –          |        ✔         |        –        |
| אישור / דחיית מנהל (`POST /api/orders/:id/manager-approve` / `reject`) |          –          |        ✔         |        –        |
| עדכון סטטוס "בהדפסה" (`POST /api/orders/:id/start-printing`)           |          –          |        ✔         |        ✔        |
| עדכון סטטוס "מוכן לאיסוף" (`POST /api/orders/:id/ready-for-pickup`)    |          –          |        ✔         |        ✔        |
| עדכון סטטוס "הושלם" (`POST /api/orders/:id/complete`)                  |          –          |        ✔         |        ✔        |
| ניהול תפקידי משתמשים (`/api/admin/users/*`)                            |          –          |        ✔         |        –        |

---

## 4. ארכיטקטורת מערכת – תמונה כללית (As-Built)

המערכת בנויה כ-**Monorepo** המכיל 3 חבילות (`workspaces`):

1. `shared-types`: חבילת טיפוסי TypeScript משותפת, חוקי מעברי סטטוס (`isOrderStatusTransitionAllowed`) וקבועים.
2. `backend`: שרת Express, שכבת Services, Prisma ORM ושני Workers אסינכרוניים.
3. `frontend`: אפליקציית React (Vite + MUI RTL).

```mermaid
graph TD
    subgraph Client["Client - React SPA (frontend)"]
        UI1["קטלוג, דף מוצר ועגלה"]
        UI2["Checkout + הזנת קצין תקציב"]
        UI3["פאנל מנהל ותור עובד"]
        UI4["בונה מוצר דינמי + ניהול תפקידים"]
        UI5["דף אישור תקציבי ציבורי (Token)"]
    end

    subgraph Proxy["Reverse Proxy - Nginx / IIS"]
        AUTH["Windows Integrated Auth (X-Remote-User)\nאו Dev Mock Header (X-Mock-User)"]
    end

    subgraph Backend["Node.js + Express API (backend)"]
        API["Routes & Controllers + Zod Validation"]
        SVC1["Catalog & Attribute Services"]
        SVC2["Pricing Engine Service"]
        SVC3["Cart Service"]
        SVC4["Order Service & OrderNumberGenerator"]
        SVC5["Approval Service & Token Service"]
        SVC6["Email & EmailParser Services"]
        SVC7["File Storage Service"]
        SVC8["Notification Service"]
        SVC9["Audit Log Service"]
        SVC10["User Management Service"]
        W1["NotificationWorker\n(Outbox DB Polling)"]
        W2["ImapPollingWorker\n(Inbox IMAP Polling + DMARC)"]
    end

    subgraph Infra["תשתית ארגונית On-Prem / Docker"]
        DB[("PostgreSQL 15")]
        FS[("File Storage\n(uploads / STORAGE_PATH)")]
        MAIL["Exchange On-Prem\nSMTP + IMAP"]
    end

    Client --> Proxy --> API
    API --> SVC1 & SVC2 & SVC3 & SVC4 & SVC5 & SVC7 & SVC8 & SVC9 & SVC10
    SVC1 & SVC2 & SVC3 & SVC4 & SVC5 & SVC8 & SVC9 & SVC10 --> DB
    SVC7 --> FS
    W1 --> DB
    W1 --> SVC6 --> MAIL
    W2 --> MAIL
    W2 --> SVC6 & SVC5 & SVC8
```

---

## 5. Technology Stack

| שכבה                   | טכנולוגיה                                                         | הערות ומימוש בפועל                               |
| :--------------------- | :---------------------------------------------------------------- | :----------------------------------------------- |
| **Monorepo**           | npm workspaces                                                    | `shared-types`, `backend`, `frontend`            |
| **Frontend**           | React 18 + TypeScript + Vite                                      | תמיכת RTL מלאה                                   |
| **UI Kit**             | MUI v5 (`@mui/material`) + `stylis-plugin-rtl`                    | עיצוב מותאם ב-`src/theme/`                       |
| **Forms & Validation** | `react-hook-form` + `zod`                                         | ולידציה משולבת בצד לקוח ובצד שרת                 |
| **State Management**   | TanStack React Query v5 + Zustand                                 | React Query לנתוני שרת, Zustand ל-Auth ו-Cart UI |
| **Routing**            | React Router v6                                                   | מוגדר ב-`frontend/src/routes/AppRoutes.tsx`      |
| **Backend**            | Node.js + Express 4 + TypeScript                                  | מוגדר ב-`backend/src/app.ts` ו-`server.ts`       |
| **DB & ORM**           | PostgreSQL 15 + Prisma v7 (`@prisma/adapter-pg`)                  | סכמה ב-`backend/prisma/schema.prisma`            |
| **Auth**               | Windows Integrated Auth (`X-Remote-User`) + מצב `mock` לפיתוח     | נשלט ע"י `AUTH_MODE` (`iwa` או `mock`)           |
| **Email (Outbound)**   | Nodemailer (`EmailService`) + תור `NotificationJob` ב-DB          | מופעל אסינכרונית ע"י `NotificationWorker`        |
| **Email (Inbound)**    | `imapflow` + `mailparser` (`ImapPollingWorker`)                   | כולל אימות `Authentication-Results` (DMARC)      |
| **File Upload**        | Multer (זיכרון) + אימות Magic Bytes (`FileStorageService`)        | PDF, JPEG, PNG עד 20MB, שמירה מאובטחת בדיסק      |
| **Logging**            | Winston + `winston-daily-rotate-file` + טבלת `OrderStatusHistory` | לוגים מובנים בפורמט JSON/טקסט                    |
| **Testing**            | Jest + `ts-jest` + `supertest`                                    | 15 חבילות בדיקות יחידה ואינטגרציה ב-`backend`    |

---

## 6. מודל נתונים (ERD עדכני)

התרשים להלן משקף את הסכמה המדויקת מתוך `backend/prisma/schema.prisma` (כולל הטבלאות `notification_jobs` ו-`order_number_counters` שנוספו במימוש):

```mermaid
erDiagram
    USERS ||--o{ ORDERS : "requester / manager / worker"
    USERS ||--o{ CARTS : "owns"
    USERS ||--o{ ORDER_STATUS_HISTORY : "performs"
    USERS ||--o{ PRODUCTS : "creates"

    PRODUCTS ||--o{ PRODUCT_ATTRIBUTE_DEFINITIONS : "has"
    PRODUCT_ATTRIBUTE_DEFINITIONS ||--o{ PRODUCT_ATTRIBUTE_OPTIONS : "has"

    PRODUCTS ||--o{ ORDER_ITEMS : "referenced_by"
    PRODUCTS ||--o{ CART_ITEMS : "referenced_by"

    CARTS ||--o{ CART_ITEMS : "contains"
    ORDERS ||--o{ ORDER_ITEMS : "contains"

    ORDER_ITEMS ||--o{ ORDER_ITEM_ATTRIBUTE_VALUES : "has"
    PRODUCT_ATTRIBUTE_DEFINITIONS ||--o{ ORDER_ITEM_ATTRIBUTE_VALUES : "referenced_by"
    PRODUCT_ATTRIBUTE_OPTIONS ||--o{ ORDER_ITEM_ATTRIBUTE_VALUES : "referenced_by (nullable)"

    ORDERS ||--o{ ORDER_STATUS_HISTORY : "has"
    ORDERS ||--o{ APPROVAL_TOKENS : "has"
    ORDERS ||--o{ EMAIL_LOG : "linked_to"
    ORDERS ||--o{ NOTIFICATION_JOBS : "queues"

    USERS {
        uuid id PK
        string full_name
        string military_email
        string ad_username UK
        string unit
        string phone
        enum role "REQUESTER|MANAGER|WORKER"
        timestamp created_at
        boolean is_deleted
    }

    PRODUCTS {
        uuid id PK
        string name
        string description
        string image_url
        string category
        enum product_type "FIXED|DYNAMIC"
        decimal base_price
        boolean is_active
        uuid created_by FK
        timestamp created_at
        boolean is_deleted
        int min_quantity
        int max_quantity
    }

    PRODUCT_ATTRIBUTE_DEFINITIONS {
        uuid id PK
        uuid product_id FK
        string attribute_name
        enum attribute_type "SELECT|NUMBER|BOOLEAN|TEXT|FILE_UPLOAD"
        enum display_style "DROPDOWN|CARDS|NUMBER_INPUT|CHECKBOX|SWITCH|SINGLE_LINE|MULTI_LINE|FILE_DROPZONE"
        boolean is_required
        int display_order
        enum pricing_rule "NONE|PER_UNIT_MULTIPLIER|FLAT_ADD_PER_OPTION"
        decimal unit_price
        decimal min_value
        decimal max_value
        boolean is_deleted
    }

    PRODUCT_ATTRIBUTE_OPTIONS {
        uuid id PK
        uuid attribute_definition_id FK
        string option_label
        string option_value
        decimal price_modifier
        enum price_modifier_type "FIXED_ADD|MULTIPLY"
        int display_order
        boolean is_per_unit
        boolean is_deleted
    }

    CARTS {
        uuid id PK
        uuid user_id FK
        enum status "ACTIVE|CONVERTED|ABANDONED"
        timestamp created_at
        timestamp updated_at
        boolean is_deleted
    }

    CART_ITEMS {
        uuid id PK
        uuid cart_id FK
        uuid product_id FK
        decimal quantity
        string uploaded_file_path
        decimal computed_price
        json selected_attributes
        boolean is_deleted
    }

    ORDERS {
        uuid id PK
        string order_number UK
        uuid requester_id FK
        string unit
        enum status "PENDING_BUDGET|PENDING_MANAGER_APPROVAL|APPROVED_FOR_PRODUCTION|IN_PRODUCTION|READY_FOR_PICKUP|COMPLETED|REJECTED_BUDGET|REJECTED_MANAGER|CANCELLED"
        string budget_officer_name
        string budget_officer_email
        decimal total_price
        uuid approved_by_manager_id FK
        timestamp approved_by_manager_at
        timestamp approved_by_budget_at
        uuid worker_id FK
        text pickup_instructions
        timestamp completed_at
        timestamp created_at
        boolean is_deleted
    }

    ORDER_NUMBER_COUNTERS {
        int year PK
        int last_value
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        decimal quantity
        string uploaded_file_path
        decimal computed_unit_price
        decimal computed_total_price
        boolean is_deleted
    }

    ORDER_ITEM_ATTRIBUTE_VALUES {
        uuid id PK
        uuid order_item_id FK
        uuid attribute_definition_id FK
        uuid selected_option_id FK "Nullable (for NUMBER/TEXT/BOOLEAN)"
        string value_text
        boolean is_deleted
    }

    ORDER_STATUS_HISTORY {
        uuid id PK
        uuid order_id FK
        enum from_status
        enum to_status
        uuid changed_by_user_id FK
        enum changed_by_source "SYSTEM|EMAIL_BUDGET_OFFICER|MANAGER_UI|WORKER_UI"
        timestamp changed_at
        text note
        boolean is_deleted
    }

    APPROVAL_TOKENS {
        uuid id PK
        uuid order_id FK
        string token UK "SHA-256 Hash"
        boolean is_used
        timestamp expires_at
        timestamp used_at
        boolean is_deleted
    }

    EMAIL_LOG {
        uuid id PK
        uuid order_id FK
        enum direction "OUTBOUND|INBOUND"
        enum type "BUDGET_APPROVAL|ORDER_CONFIRMATION|BUDGET_DECISION_CONFIRMATION|READY_FOR_PICKUP|INBOUND_REPLY|INBOUND_OTHER"
        string to_address
        string from_address
        string subject
        enum processed_status "PENDING|APPROVED|REJECTED|ERROR"
        timestamp created_at
        boolean is_deleted
    }

    NOTIFICATION_JOBS {
        uuid id PK
        uuid order_id FK
        enum type "ORDER_CONFIRMATION|BUDGET_APPROVAL|BUDGET_DECISION_CONFIRMATION|READY_FOR_PICKUP"
        enum status "PENDING|PROCESSING|SENT|FAILED"
        json payload
        int attempts
        string last_error
        timestamp created_at
        timestamp processing_started_at
        timestamp processed_at
    }
```

---

## 7. מנוע המוצר הדינמי (EAV Engine)

מנהל בית הדפוס בונה ועורך מוצרים דרך מסך **"בונה מוצר"** (`/admin/builder` או `/manager/products/:productId/edit`), ומגדיר עבור המוצר מאפיינים (`ProductAttributeDefinition`) ואפשרויות בחירה (`ProductAttributeOption`):

| Attribute Type | סגנונות תצוגה נתמכים (`displayStyle`) | תיאור והתנהגות                                                                                                                                                                                  |
| :------------- | :------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SELECT`       | `DROPDOWN`, `CARDS`, `CHECKBOX`       | בחירת אפשרות אחת (`DROPDOWN` / `CARDS`) או בחירה מרובה (`CHECKBOX` – שומר מערך `selectedOptionIds`). לכל אופציה `priceModifier`, `priceModifierType` (`FIXED_ADD` / `MULTIPLY`), ו-`isPerUnit`. |
| `NUMBER`       | `NUMBER_INPUT`                        | שדה מספרי עם טווח (`minValue` / `maxValue`). בחוק `PER_UNIT_MULTIPLIER` מוכפל ב-`unitPrice` ובכמות ההזמנה.                                                                                      |
| `BOOLEAN`      | `CHECKBOX`, `SWITCH`                  | מתג או תיבת סימון בוליאנית. אם מסומן (`true`), מוסיף `unitPrice` (לפי חוק התמחור).                                                                                                              |
| `TEXT`         | `SINGLE_LINE`, `MULTI_LINE`           | טקסט חופשי ללא השפעה על המחיר.                                                                                                                                                                  |
| `FILE_UPLOAD`  | `FILE_DROPZONE`                       | העלאת קובץ הדפסה (PDF/JPEG/PNG עד 20MB).                                                                                                                                                        |

---

## 8. מנוע תמחור (Pricing Engine)

ממומש ב-`backend/src/services/pricing-engine.service.ts` (`PricingEngineService.calculatePrice`).
השירות תומך בריצה עצמאית (עבור תצוגה מקדימה בעמוד המוצר `POST /api/pricing/calculate`) או בתוך טרנזקציית Prisma קיימת (בעת הוספה לעגלה ובעת `createOrderFromCart`).

### עקרונות החישוב בפועל:

1. **מחיר בסיס (`basePrice`):** מוכפל בכמות הפריטים (`quantity`), ומופיע כשורה הראשונה ב-`breakdown` (אם `basePrice > 0`).
2. **עבור כל מאפיין שנבחר (`selectedAttributes`):**
   - **`SELECT` (יחיד או מרובה `selectedOptionIds`):**
     - אם `priceModifierType === 'FIXED_ADD'`: מוסיף `priceModifier * quantity` כאשר `isPerUnit === true`, או `priceModifier` חד-פעמי כאשר `isPerUnit === false`.
     - אם `priceModifierType === 'MULTIPLY'`: מכפיל או מוסיף יחסית למחיר הבסיס בהתאם להגדרת `isPerUnit`.
   - **`NUMBER`:** כאשר `pricingRule === 'PER_UNIT_MULTIPLIER'`, מחשב `numericValue * unitPrice * quantity`.
   - **`BOOLEAN`:** כאשר הערך `true`, מוסיף `unitPrice * quantity` (ב-`PER_UNIT_MULTIPLIER`) או `unitPrice` קבוע (ב-`FLAT_ADD_PER_OPTION`).
3. **פלט (`PriceCalculationResult`):**
   - `unitPrice`: מחיר ליחידה (מעוגל ל-2 ספרות אחרי הנקודה).
   - `totalPrice`: מחיר כולל להזמנה.
   - `breakdown`: מערך שורות פירוט (`PriceBreakdownLine`), כאשר כל שורה כוללת גם `calculationItems` להצגת נוסחת החישוב המדויקת ברכיב ה-`PriceBreakdown` ב-Frontend.

> **אבטחת מחיר:** המחיר הסופי הנשמר ב-`CartItem` וב-`OrderItem` מחושב **תמיד מחדש בצד השרת** מתוך הגדרות המסד, ולא מסתמך על ערכים מהלקוח.

---

## 9. מכונת מצבים – זרימת הזמנה ואישורים

חוקי המעבר מוגדרים במקום אחד משותף: `shared-types/src/order-status-transitions.ts` ונאכפים ב-`ApprovalService.transitionOrderStatus` (`backend/src/services/approval.service.ts`).

### תרשים מצבים עדכני (As-Built)

```mermaid
stateDiagram-v2
    [*] --> PENDING_BUDGET : יצירת הזמנה (Checkout)
    PENDING_BUDGET --> PENDING_MANAGER_APPROVAL : קצין תקציב אישר (מייל / טוקן)
    PENDING_BUDGET --> REJECTED_BUDGET : קצין תקציב דחה (מייל / טוקן)
    PENDING_BUDGET --> CANCELLED : ביטול

    PENDING_MANAGER_APPROVAL --> APPROVED_FOR_PRODUCTION : מנהל אישר לביצוע
    PENDING_MANAGER_APPROVAL --> REJECTED_MANAGER : מנהל דחה
    PENDING_MANAGER_APPROVAL --> CANCELLED : ביטול

    APPROVED_FOR_PRODUCTION --> IN_PRODUCTION : עובד/מנהל התחיל הדפסה
    APPROVED_FOR_PRODUCTION --> CANCELLED : ביטול

    IN_PRODUCTION --> READY_FOR_PICKUP : הדפסה הושלמה (מוכן לאיסוף)
    IN_PRODUCTION --> CANCELLED : ביטול

    READY_FOR_PICKUP --> COMPLETED : נמסר למזמין
    READY_FOR_PICKUP --> CANCELLED : ביטול

    REJECTED_BUDGET --> [*]
    REJECTED_MANAGER --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]
```

### הגנה מפני Race Conditions (נעילת שורה ב-DB)

בכל קריאה ל-`ApprovalService.transitionOrderStatus`:

1. נפתחת טרנזקציית Prisma (`prisma.$transaction`).
2. מבוצעת שאילתת נעילה אקסקלוסיבית ב-PostgreSQL:
   `SELECT id FROM orders WHERE id = $1::uuid AND is_deleted = false FOR UPDATE`.
3. נבדקת חוקיות המעבר באמצעות `isOrderStatusTransitionAllowed(currentStatus, toStatus)`.
4. הסטטוס מתעדכן יחד עם חותמות זמן (`approvedByBudgetAt`, `approvedByManagerAt`, `approvedByManagerId`, `pickupInstructions`) ונרשמת שורת היסטוריה ב-`OrderStatusHistory` דרך `AuditLogService.logStatusChange` באותה טרנזקציה.
5. רק לאחר ה-Commit של הטרנזקציה, נשלחות התראות מייל רלוונטיות (`ORDER_CONFIRMATION` לאחר אישור תקציבי, או `READY_FOR_PICKUP` כשהזמנה מוכנה לאיסוף).

---

## 10. אינטגרציית מייל ארגוני ו-Workers ברקע

### 10.1 הזנת קצין תקציב ב-Checkout

בעמוד ה-Checkout (`frontend/src/pages/checkout/CheckoutPage.tsx` ו-`BudgetOfficerForm.tsx`):

- המזמין מזין את **שם קצין התקציב** ואת **מספר אישי מנהל תקציב** בפורמט של אות קידומת באנגלית + 7 עד 8 ספרות (לדוגמה: `s1234567`).
- ה-Frontend מאמת את הפורמט (`/^[a-zA-Z]\d{7,8}$/`), ממיר לאות קטנה ומשלים אוטומטית את הסיומת `@army.idf.il` (לדוגמה: `s1234567@army.idf.il`) לפני שליחת הבקשה לשרת.

### 10.2 שליחת מיילים אסינכרונית (`NotificationWorker` – Outbox Pattern)

כדי שבקשת ה-Checkout או שינויי סטטוס לא ייחסמו או ייכשלו בגלל איטיות בשרת ה-SMTP:

1. בעת יצירת הזמנה (או שינוי סטטוס), נכתבת רשומה לטבלת `notification_jobs` בסטטוס `PENDING`.
2. **`NotificationWorker`** (`backend/src/workers/notification.worker.ts`) דוגם את הטבלה בכל 5 שניות (`NOTIFICATION_POLL_INTERVAL_MS`):
   - תופס עבודות פנויות או עבודות שנתקעו מעל 5 דקות (`PROCESSING` Lease Recovery).
   - עבור `BUDGET_APPROVAL`: מייצר טוקן אישור חד-פעמי מוצפן (`TokenService.getOrCreateApprovalToken`), מרנדר את התבנית `src/templates/emails/budget-approval.html` ושולח דרך `EmailService`.
   - במקרה של שגיאת SMTP: מגדיל את `attempts` (עד 5 ניסיונות) ושומר את השגיאה ב-`lastError`.

### 10.3 קליטת מענה במייל (`ImapPollingWorker`)

ממומש ב-`backend/src/workers/imap-poller.worker.ts`:

1. מתחבר לתיבת ה-IMAP הארגונית בכל 2 דקות (`IMAP_POLL_INTERVAL_MS`) ושולף הודעות שלא נקראו (`seen: false`).
2. **אימות אבטחה (DMARC & Trusted AuthServ-ID):**
   - ה-Worker דורש הגדרה מפורשת של `IMAP_TRUSTED_AUTHSERV_ID` ו-`IMAP_AUTH_RESULTS_TRUST_VERIFIED=true`.
   - הפונקציה `verifySenderAuthentication` בודקת שכותרת `Authentication-Results` הגיעה משרת האימות הארגוני המהימן, מכילה `dmarc=pass`, ושדומיין ה-`header.from` תואם לדומיין השולח.
3. **פענוח ההחלטה (`EmailParserService`):**
   - מחלץ את מספר ההזמנה (`YYYY-NNNN`) מהנושא או מגוף המייל.
   - מנקה חתימות וציטוטים קודמים (Replies) ומזהה החלטת אישור (`מאשר`, `מאושר`, `אושר`, וכו') או דחייה (`לא מאשר`, `נדחה`, `דוחה`, וכו').
4. מוודא שכתובת השולח תואמת ל-`order.budgetOfficerEmail` של ההזמנה.
5. מפעיל את `ApprovalService.transitionOrderStatus` למעבר ל-`PENDING_MANAGER_APPROVAL` או `REJECTED_BUDGET`, ושולח מייל אישור קבלת החלטה (`BUDGET_DECISION_CONFIRMATION`) חזרה לקצין התקציב.

### 10.4 אישור באמצעות קישור חד-פעמי מאובטח (Public Token Flow)

- המייל לקצין התקציב כולל קישור: `${APP_BASE_URL}/approve-order?token=<uuid>`.
- בטבלת `APPROVAL_TOKENS` נשמר **רק ה-Hash (SHA-256)** של הטוקן (`hashToken` ב-`backend/src/utils/crypto.utils.ts`), כך שגם בחשיפת DB לא ניתן לשחזר קישורים פעילים.
- קצין התקציב צופה בסיכום ההזמנה בעמוד `/approve-order` (`PublicApprovalPage.tsx`) ויכול לאשר או לדחות (כולל הזנת סיבת דחייה) ללא צורך בהתחברות למערכת.

---

## 11. שכבות קוד, Services ו-Workers (Backend)

מבנה תיקיית `backend/src/`:

```text
backend/src/
  config/          # חיבור Prisma + PostgreSQL Pool (db.ts)
  controllers/     # שכבת HTTP Controllers
  middlewares/     # auth.middleware, rbac.middleware, file-upload.middleware
  routes/          # הגדרת כל נתיבי ה-API
  services/        # כל הלוגיקה העסקית + תיקיית __tests__
  templates/       # תבניות HTML למיילים (emails/*.html)
  utils/           # logger, crypto.utils, file-validation, order-number-generator
  validations/     # סכמות ולידציה ב-Zod
  workers/         # notification.worker.ts, imap-poller.worker.ts
```

| רכיב / Service            | קובץ                                  | אחריות מרכזית                                                                                     |
| :------------------------ | :------------------------------------ | :------------------------------------------------------------------------------------------------ |
| **CatalogService**        | `services/catalog.service.ts`         | שליפת מוצרים לקטלוג ולמנהל, יצירה/עדכון/מחיקה רכה (`isDeleted`) של מוצרים ומאפיינים.              |
| **AttributeService**      | `services/attribute.service.ts`       | ניהול הגדרות מאפיינים (`ProductAttributeDefinition`) ואפשרויות (`ProductAttributeOption`).        |
| **PricingEngineService**  | `services/pricing-engine.service.ts`  | חישוב מחיר פריט ופירוט שורות חישוב (`breakdown` + `calculationItems`).                            |
| **CartService**           | `services/cart.service.ts`            | ניהול עגלת הקניות הפעילה של המשתמש, הוספה/עדכון/מחיקה וניקוי עגלה.                                |
| **OrderService**          | `services/order.service.ts`           | המרת עגלה להזמנה (`createOrderFromCart`) בטרנזקציה אחת, תמחור מחדש, שליפת הזמנות עם סינון ודפדוף. |
| **OrderNumberGenerator**  | `utils/order-number-generator.ts`     | הפקת מספר הזמנה סידורי אטומי לפי שנה (`YYYY-NNNN`) באמצעות טבלת `order_number_counters`.          |
| **ApprovalService**       | `services/approval.service.ts`        | מכונת המצבים המרכזית עם נעילת `FOR UPDATE`, תיעוד היסטוריה והפעלת התראות.                         |
| **TokenService**          | `services/token.service.ts`           | יצירה, גיבוב (SHA-256), אימות וצריכה חד-פעמית של טוקני אישור תקציבי.                              |
| **NotificationService**   | `services/notification.service.ts`    | רישום עבודות התראה חדשות לטבלת `notification_jobs`.                                               |
| **EmailService**          | `services/email.service.ts`           | טעינת תבניות HTML, שליחת מיילים דרך SMTP (Nodemailer) ורישום ל-`email_log`.                       |
| **EmailParserService**    | `services/email-parser.service.ts`    | חילוץ מספר הזמנה וזיהוי החלטת אישור/דחייה מתוך טקסט מייל חופשי בעברית.                            |
| **FileStorageService**    | `services/file-storage.service.ts`    | בדיקת Magic Bytes, שמירה מאובטחת בתיקיית אחסון שנתית/חודשית, ומניעת Path Traversal.               |
| **AuditLogService**       | `services/audit-log.service.ts`       | כתיבה ושליפה של היסטוריית שינויי סטטוס (`OrderStatusHistory`).                                    |
| **UserManagementService** | `services/user-management.service.ts` | שליפת משתמשים ועדכון תפקיד בין `REQUESTER` ל-`WORKER` ע"י מנהל.                                   |
| **AuthService**           | `services/auth.service.ts`            | מיפוי `adUsername` למשתמש ב-DB, ויצירה אוטומטית (Auto-provisioning) בכניסה ראשונה.                |

---

## 12. ארכיטקטורת Frontend וניווט

מבנה תיקיית `frontend/src/`:

```text
frontend/src/
  components/
    checkout/              # BudgetOfficerForm
    common/                # רכיבי UI משותפים
    DynamicAttributeInput/ # רנדור דינמי של שדות מוצר לפי AttributeType ו-DisplayStyle
    FileUploadDropzone/    # העלאת קבצים עם ולידציה מקומית
    layout/                # MainLayout, Header (כולל חיווי עגלה ו-DevUserSwitcher)
    orders/                # רכיבי תצוגת הזמנות
    PriceBreakdown/        # פירוט חישוב מחיר מלא
    StatusBadge/           # תגית סטטוס הזמנה צבעונית
  pages/
    catalog/               # עמוד קטלוג ראשי (/)
    product-detail/        # דף מוצר והתאמה אישית (/product/:id)
    cart/                  # עגלת קניות (/cart)
    checkout/              # עמוד Checkout (/checkout) ועמוד הצלחה (/checkout/success)
    my-orders/             # הזמנות אישיות למזמין (/my-orders)
    order-details-page/    # פרטי הזמנה למזמין (/orders/:orderId)
    public/                # עמוד אישור תקציבי ציבורי (/approve-order?token=...)
    worker/                # תור עבודה לעובד דפוס (/worker/queue)
    role-management-page/  # ניהול הרשאות משתמשים למנהל (/manager/roles)
    admin/
      orders-table/        # טבלת ניהול הזמנות (/admin/orders)
      order-detail/        # פרטי הזמנה ופעולות ניהול/ייצור (/admin/order/:id)
      product-builder/     # בונה מוצר דינמי (/admin/builder, /admin/builder/:id)
  routes/
    AppRoutes.tsx          # הגדרת כל הנתיבים באפליקציה
  services/api/            # שכבת תקשורת מול ה-Backend (apiFetch + שירותים לפי תחום)
  store/                   # useAuthStore, useCartStore (Zustand)
  theme/                   # הגדרות MUI RTL (theme.ts, rtlCache.ts)
```

---

## 13. API Endpoints (מיפוי מלא מהקוד)

### Auth (`/api/auth`)

| Method | Path                        | הרשאה                | תיאור                                                  |
| :----- | :-------------------------- | :------------------- | :----------------------------------------------------- |
| `GET`  | `/api/auth/me`              | מאומת                | החזרת פרטי המשתמש המחובר (או יצירתו ב-Auto-provision). |
| `POST` | `/api/auth/dev-switch-user` | סביבת פיתוח (`mock`) | החלפת משתמש/תפקיד מהירה בפיתוח (`DevUserSwitcher`).    |

### Catalog & Admin Products (`/api/products`, `/api/admin/products`)

| Method   | Path                      | הרשאה     | תיאור                                     |
| :------- | :------------------------ | :-------- | :---------------------------------------- |
| `GET`    | `/api/products`           | כולם      | רשימת מוצרים פעילים בקטלוג.               |
| `GET`    | `/api/products/:id`       | כולם      | פרטי מוצר פעיל כולל מאפיינים ואפשרויות.   |
| `GET`    | `/api/admin/products`     | `MANAGER` | כל המוצרים (כולל לא פעילים) לניהול.       |
| `GET`    | `/api/admin/products/:id` | `MANAGER` | פרטי מוצר מלאים לעריכה בבונה המוצר.       |
| `POST`   | `/api/admin/products`     | `MANAGER` | יצירת מוצר חדש (כולל מאפיינים ואפשרויות). |
| `PUT`    | `/api/admin/products/:id` | `MANAGER` | עדכון מוצר קיים ומאפייניו.                |
| `DELETE` | `/api/admin/products/:id` | `MANAGER` | מחיקה רכה (`isDeleted = true`) של מוצר.   |

### Pricing (`/api/pricing`)

| Method | Path                     | הרשאה | תיאור                                                                                      |
| :----- | :----------------------- | :---- | :----------------------------------------------------------------------------------------- |
| `POST` | `/api/pricing/calculate` | כולם  | חישוב מחיר ותצוגה מקדימה (`breakdown`) לפי `productId`, `quantity` ו-`selectedAttributes`. |

### Cart (`/api/cart`)

| Method   | Path                  | הרשאה       | תיאור                              |
| :------- | :-------------------- | :---------- | :--------------------------------- |
| `GET`    | `/api/cart`           | `REQUESTER` | שליפת העגלה הפעילה של המשתמש.      |
| `POST`   | `/api/cart/items`     | `REQUESTER` | הוספת פריט לעגלה (מחשב מחיר בשרת). |
| `PATCH`  | `/api/cart/items/:id` | `REQUESTER` | עדכון כמות/מאפיינים של פריט בעגלה. |
| `DELETE` | `/api/cart/items/:id` | `REQUESTER` | הסרת פריט בודד מהעגלה.             |
| `DELETE` | `/api/cart/items`     | `REQUESTER` | ריקון כל העגלה הפעילה.             |
| `POST`   | `/api/cart/checkout`  | `REQUESTER` | יצירת הזמנה חדשה מהעגלה הפעילה.    |

### Orders, Manager & Worker Actions (`/api/orders`)

| Method | Path                               | הרשאה                  | תיאור                                                                  |
| :----- | :--------------------------------- | :--------------------- | :--------------------------------------------------------------------- |
| `POST` | `/api/orders/checkout`             | `REQUESTER`            | נתיב נוסף ליצירת הזמנה מהעגלה הפעילה.                                  |
| `GET`  | `/api/orders/my-orders`            | `REQUESTER`            | רשימת ההזמנות האישיות של המזמין.                                       |
| `GET`  | `/api/orders`                      | `MANAGER`, `WORKER`    | רשימת הזמנות מערכתית (תומך בסינון `status`, `search`, מיון ודפדוף).    |
| `GET`  | `/api/orders/:id`                  | כולם (לפי בעלות/תפקיד) | פרטי הזמנה מלאים.                                                      |
| `GET`  | `/api/orders/:id/history`          | כולם (לפי בעלות/תפקיד) | היסטוריית מעברי סטטוס של ההזמנה (`OrderStatusHistory`).                |
| `POST` | `/api/orders/:id/manager-approve`  | `MANAGER`              | אישור ניהולי (`PENDING_MANAGER_APPROVAL` → `APPROVED_FOR_PRODUCTION`). |
| `POST` | `/api/orders/:id/manager-reject`   | `MANAGER`              | דחיית מנהל (`PENDING_MANAGER_APPROVAL` → `REJECTED_MANAGER`).          |
| `POST` | `/api/orders/:id/start-printing`   | `MANAGER`, `WORKER`    | תחילת הדפסה (`APPROVED_FOR_PRODUCTION` → `IN_PRODUCTION`).             |
| `POST` | `/api/orders/:id/ready-for-pickup` | `MANAGER`, `WORKER`    | סיום הדפסה ומוכן לאיסוף (`IN_PRODUCTION` → `READY_FOR_PICKUP`).        |
| `POST` | `/api/orders/:id/complete`         | `MANAGER`, `WORKER`    | השלמת הזמנה ומסירה (`READY_FOR_PICKUP` → `COMPLETED`).                 |

### Public Budget Approval (`/api/public`)

| Method | Path                               | הרשאה                      | תיאור                                                            |
| :----- | :--------------------------------- | :------------------------- | :--------------------------------------------------------------- |
| `GET`  | `/api/public/approval-info/:token` | ציבורי (מוגן טוקן)         | שליפת פרטי הזמנה להצגה בדף האישור התקציבי.                       |
| `POST` | `/api/public/approve-budget`       | ציבורי (מוגן טוקן חד-פעמי) | ביצוע החלטת קצין תקציב (`APPROVE` או `REJECT` + `rejectReason`). |

### Files (`/api/files`)

| Method | Path                                | הרשאה                     | תיאור                                           |
| :----- | :---------------------------------- | :------------------------ | :---------------------------------------------- |
| `POST` | `/api/files/upload`                 | מאומת                     | העלאת קובץ (`multipart/form-data`, שדה `file`). |
| `GET`  | `/api/files/download?path=...`      | מאומת (בדיקת בעלות/תפקיד) | הורדת קובץ הדפסה שצורף להזמנה או לעגלה.         |
| `GET`  | `/api/files/product-image?path=...` | מאומת                     | הורדת תמונת מוצר הרשומה בקטלוג.                 |

### User Role Management (`/api/admin/users`)

| Method  | Path                        | הרשאה     | תיאור                                         |
| :------ | :-------------------------- | :-------- | :-------------------------------------------- |
| `GET`   | `/api/admin/users`          | `MANAGER` | שליפת כל המשתמשים הפעילים במערכת.             |
| `PATCH` | `/api/admin/users/:id/role` | `MANAGER` | שינוי תפקיד משתמש בין `REQUESTER` ל-`WORKER`. |

---

## 14. אימות, הרשאות וניהול תפקידים (Auth & RBAC)

ממומש ב-`backend/src/middlewares/auth.middleware.ts` ו-`rbac.middleware.ts`:

1. **מצב Production / IWA (`AUTH_MODE=iwa`):**
   - ה-Reverse Proxy (Nginx / IIS) מאמת את המשתמש מול Active Directory (Kerberos/NTLM) ומעביר את הכותרת `X-Remote-User` (לדוגמה `DOMAIN\username`).
   - ה-Middleware מנקה את שם הדומיין, מאמת תווים חוקיים, ושולף או יוצר אוטומטית את המשתמש בטבלת `users` עם תפקיד ברירת מחדל `REQUESTER`.
2. **מצב פיתוח (`AUTH_MODE=mock` ב-`NODE_ENV !== 'production'`):**
   - מאפשר פיתוח מקומי קל ללא שרת Active Directory.
   - קורא את הכותרת `X-Mock-User` (שנשלחת מ-`apiFetch` ב-Frontend לפי הבחירה ב-`DevUserSwitcher` שבראש העמוד: `requester`, `manager`, או `worker`).
   - חסום לחלוטין אם `NODE_ENV === 'production'` (הגנת Fail-Safe בקוד).
3. **ניהול תפקידים מתוך המערכת (`/manager/roles`):**
   - מנהל מערכת יכול להיכנס למסך **"ניהול הרשאות"** ולשנות משתמשים מ-`REQUESTER` ל-`WORKER` ובחזרה (ללא צורך בעדכון ידני ב-DB). לא ניתן לשנות או להסיר הרשאת `MANAGER` דרך הממשק למניעת נעילת מנהלים.

---

## 15. אבטחת מידע ודרישות לא פונקציונליות

- **אימות קבצים דו-שלבי (Magic Bytes):** ב-`FileStorageService` וב-`file-validation.utils.ts`, הקובץ לא נבדק רק לפי סיומת או `mimetype` מהדפדפן, אלא לפי ה-Magic Bytes הבינאריים האמיתיים של התוכן (`%PDF-`, `FF D8 FF` ל-JPEG, `89 50 4E 47` ל-PNG).
- **הגנה מפני Path Traversal:** בעת הורדת קובץ (`GET /api/files/download`), הנתיב מנורמל ונבדק שהוא נמצא אך ורק תחת תיקיית ה-`STORAGE_PATH` המורשית ושאינו מכיל תווי `..` או הפניות לקבצי מערכת. בנוסף נבדקת הרשאה פרטנית מול ה-DB (מזמין יכול להוריד רק קבצים המשויכים לעגלה או להזמנות שלו).
- **הצפנת טוקני אישור:** טוקנים לאישור תקציבי נשמרים ב-DB כ-SHA-256 Hash חד-כיווני בלבד.
- **אימות שולח מייל (DMARC):** ה-`ImapPollingWorker` מוודא שהמייל עבר אימות DMARC מול שרת הדואר הארגוני המהימן לפני ביצוע שינוי סטטוס כלשהו.

---

## 16. מקרי קצה – מימוש טכני בפועל

1. **אישור תקציבי כפול (קליק כפול בטוקן או מייל + טוקן במקביל):**
   - מוגן בשתי שכבות: `TokenService.validateAndUseToken` בודק ומסמן `isUsed = true`, ו-`ApprovalService.transitionOrderStatus` נועל את שורת ההזמנה ב-DB (`FOR UPDATE`) ומוודא שהסטטוס הוא עדיין `PENDING_BUDGET`.
2. **כישלון שליחת מייל זמני (שרת SMTP לא זמין):**
   - ההזמנה נוצרת בהצלחה והלקוח לא חווה שגיאה. ה-`NotificationWorker` ינסה לשלוח שוב את ה-`NotificationJob` עד 5 פעמים. בכל ניסיון חוזר של `BUDGET_APPROVAL`, טוקן ישן שלא נוצל מוחלף בטוקן חדש ותקף.
3. **ניסיון הזרקת מחיר מצד הלקוח:**
   - גם ב-`CartService.addItem` וגם ב-`OrderService.createOrderFromCart`, השרת מתעלם מכל מחיר שנשלח מהלקוח ומריץ את `PricingEngineService.calculatePrice` מול נתוני ה-DB העדכניים.

---

## 17. מדריך למפתח חדש (Onboarding, הרצה ובדיקות)

### 17.1 דרישות קדם

- **Node.js:** גרסה 20 LTS ומעלה.
- **Docker & Docker Compose:** להרצת מסד הנתונים PostgreSQL (ו-Nginx אופציונלי).

### 17.2 שלבי התקנה והרצה ראשונית (Quick Start)

1. **התקנת תלויות בכל ה-Monorepo:**

   ```bash
   npm install
   ```

2. **הרמת מסד הנתונים PostgreSQL ב-Docker:**

   ```bash
   docker compose up -d postgres
   ```

   _(מסד הנתונים מאזין בפורט מקומי `5433` עם משתמש `hotzla_user`, סיסמה `hotzla_password`, ושם מסד `hotzla_db`)._

3. **הגדרת קובץ סביבה (`backend/.env`):**
   שכפל את `backend/.env.example` ל-`backend/.env` וודא שהערכים הבסיסיים מוגדרים:

   ```env
   AUTH_MODE=mock
   NODE_ENV=development
   PORT=3001
   APP_BASE_URL=http://localhost:8080
   DATABASE_URL="postgresql://hotzla_user:hotzla_password@localhost:5433/hotzla_db"
   STORAGE_PATH=./uploads
   NOTIFICATION_WORKER_ENABLED=true
   ```

4. **בניית חבילת הטיפוסים המשותפת (`shared-types`):**

   > **חשוב מאוד!** בכל פעם שמשנים או מושכים שינויים ב-`shared-types`, חובה לקמפל אותה כדי ש-`backend` ו-`frontend` יכירו את הטיפוסים:

   ```bash
   npm run build:shared
   ```

5. **סנכרון סכמת Prisma וזריעת נתוני פיתוח (Seed):**

   ```bash
   npm run prisma:generate
   cd backend && npx prisma db push
   npm run db:seed
   ```

   _(פעולת ה-Seed יוצרת 3 משתמשי ברירת מחדל: `requester`, `manager`, `worker`, מוצרי קטלוג לדוגמה והזמנות בדיקה)._

6. **הרצת השרת והלקוח במקביל (ב-2 טרמינלים נפרדים מהתיקייה הראשית):**
   - טרמינל 1 (Backend בפורט `3001`):
     ```bash
     npm run dev:backend
     ```
   - טרמינל 2 (Frontend בפורט `5173`, או דרך Nginx בפורט `8080`):
     ```bash
     npm run dev:frontend
     ```

### 17.3 פקודות פיתוח ובדיקות שימושיות (מתוך שורש ה-Monorepo)

| פקודה                  | תיאור                                                                                               |
| :--------------------- | :-------------------------------------------------------------------------------------------------- |
| `npm run build:shared` | קימפול חבילת `shared-types` (חובה לאחר שינוי טיפוסים משותפים).                                      |
| `npm run type-check`   | יצירת Prisma Client ובדיקת טיפוסי TypeScript בכל 3 החבילות (`frontend`, `backend`, `shared-types`). |
| `npm run lint`         | הרצת ESLint על כל הפרויקט עם דרישת `--max-warnings 0`.                                              |
| `npm run format`       | פרמוט קוד אוטומטי באמצעות Prettier.                                                                 |
| `npm test`             | הרצת כל בדיקות ה-Unit וה-Integration ב-Backend (Jest).                                              |
| `npm run build`        | בנייה מלאה של כל החבילות (`shared-types` → `backend` → `frontend`).                                 |
| `npm run ci:local`     | הרצת כל בדיקות ה-CI מקומית (`lint` + `type-check` + `format:check` + `test`).                       |

### 17.4 כללי ברזל לפיתוח בפרויקט (Conventions)

1. **אפס אזהרות ESLint (`--max-warnings 0`):**
   - אין להשתמש ב-`any` מפורש (`@typescript-eslint/no-explicit-any`).
   - ב-Backend, כאשר תופסים שגיאה ב-`catch (error)` וזורקים שגיאה חדשה, חובה להעביר `{ cause: error }` (`new Error('...', { cause: error })`) לפי חוק `preserve-caught-error`.
2. **שינויים ב-Database:**
   - לאחר כל שינוי ב-`backend/prisma/schema.prisma`, יש להריץ `npm run prisma:generate` ו-`npx prisma db push` (או ליצור מיגרציה מסודרת).
3. **החלפת משתמשים בפיתוח:**
   - במצב `AUTH_MODE=mock`, ניתן להחליף בזמן אמת בין `מזמין` (`requester`), `מנהל` (`manager`) ו-`עובד` (`worker`) דרך תפריט ה-**DevUserSwitcher** בסרגל העליון של האפליקציה.

---

## 18. נספחים

### פורמט מספר הזמנה

`{YYYY}-{NNNN}` — שנה נוכחית + מספר סידורי בן 4 ספרות מתוך `order_number_counters` (לדוגמה: `2026-0001`).

### רשימת סטטוסים מלאה (`OrderStatus`)

- מסלול תקין:
  `PENDING_BUDGET` → `PENDING_MANAGER_APPROVAL` → `APPROVED_FOR_PRODUCTION` → `IN_PRODUCTION` → `READY_FOR_PICKUP` → `COMPLETED`
- סטטוסי דחייה וביטול סופיים:
  `REJECTED_BUDGET`, `REJECTED_MANAGER`, `CANCELLED`

</div>
