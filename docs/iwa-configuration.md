# אימות זהות משתמשים – Windows Integrated Authentication (IWA)

קובץ זה מפרט את ארכיטקטורת האימות של מערכת DPS בסביבת הרשת הארגונית מול Domain Controller (Active Directory).

## 🛡️ אסטרטגיית אימות (Dual Auth Strategy)

מאחר והפיתוח מתבצע מחוץ לרשת הארגונית (ללא גישה ל-Domain Controller):

1. **מצב פיתוח (`AUTH_MODE=mock`)**:
   - ה-`Backend` קורא הדר `X-Mock-User` המועבר מה-Frontend או מ-Nginx local.
   - מתבצע Auto-provisioning למשתמש דמו מקומי.
   - רכיב `DevUserSwitcher` ב-Header מאפשר החלפת תפקידים בלחיצת כפתור (`REQUESTER`, `MANAGER`, `WORKER`).

2. **מצב ייצור/Staging (`AUTH_MODE=iwa`)**:
   - שרת `IIS` או `Nginx Reverse Proxy` מול מודול Kerberos/NTLM מזהה את משתמש ה-Windows של המחשב בדומיין.
   - ה-Proxy מזריק הדר מאובטח: `X-Remote-User: DOMAIN\username`.
   - ה-`AuthMiddleware` ב-Backend שולף את ה-`ad_username` מתוך ההדר ומבצע Auto-provisioning במידה והמשתמש נכנס לראשונה.

---

## ⚙️ הגדרת IIS Reverse Proxy (Windows Server)

לסביבות המבוססות שרת IIS ברשת הארגונית:

1. התקן את הרכיבים `URL Rewrite` ו-`Application Request Routing (ARR)`.
2. הפעל `Windows Authentication` ב-IIS ובטל `Anonymous Authentication`.
3. הגדר את `web.config` להעביר את ההדר `X-Remote-User` עם הערך `{LOGON_USER}` לשרת ה-Node.js בפורט 3001.
