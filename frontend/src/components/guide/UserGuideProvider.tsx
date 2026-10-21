import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from '@mui/material';
import { Joyride } from 'react-joyride';
import type { Step } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../store/useAuthStore';
import { UserGuideContext } from './UserGuideContext';
import { GuideTooltip } from './GuideTooltip';

const GUIDE_SEEN_KEY = 'hotzla-user-guide-seen-v1';
const TARGET_WAIT_MS = 5000;

type GuideTarget = Step['target'];

const findGuideTarget = (target: GuideTarget): HTMLElement | null => {
  if (typeof target === 'string') {
    return document.querySelector<HTMLElement>(target);
  }

  if (typeof target === 'function') {
    return target();
  }

  if (target instanceof HTMLElement) {
    return target;
  }

  if (target && 'current' in target) {
    return target.current;
  }

  return null;
};

const waitForGuideTarget = (target: GuideTarget, timeout = TARGET_WAIT_MS) =>
  new Promise<boolean>((resolve) => {
    const startedAt = Date.now();
    const check = () => {
      if (findGuideTarget(target)) {
        resolve(true);
      } else if (Date.now() - startedAt >= timeout) {
        resolve(false);
      } else {
        window.setTimeout(check, 50);
      }
    };

    check();
  });

const getProductPageTarget = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('#guide-product-breadcrumbs') ??
  document.querySelector<HTMLElement>('#guide-product-error') ??
  document.querySelector<HTMLElement>('#guide-product-loading') ??
  document.querySelector<HTMLElement>('#guide-catalog-products');

const sidebarStep = (
  path: string,
  target: GuideTarget,
  title: string,
  content: string,
  navigate: ReturnType<typeof useNavigate>,
  currentPath: () => string,
  placement: Step['placement'] = 'left'
): Step => ({
  ...routeStep(path, target, title, content, navigate, currentPath, placement),
  isFixed: true,
  floatingOptions: {
    strategy: 'fixed',
    flipOptions: false,
    shiftOptions: { padding: 12 },
  },
});

const routeStep = (
  path: string,
  target: GuideTarget,
  title: string,
  content: string,
  navigate: ReturnType<typeof useNavigate>,
  currentPath: () => string,
  placement: Step['placement'] = 'top'
): Step => ({
  target,
  title,
  content,
  placement,
  skipBeacon: true,
  before: async () => {
    if (currentPath() !== path) {
      navigate(path);
    }

    const targetExists = await waitForGuideTarget(target);
    if (!targetExists) {
      throw new Error(`User guide could not find "${String(target)}" on ${path}`);
    }
  },
});

const currentPageStep = (
  target: GuideTarget,
  title: string,
  content: string,
  currentPath: () => string,
  placement: Step['placement'] = 'top'
): Step => ({
  target,
  title,
  content,
  placement,
  skipBeacon: true,
  before: async () => {
    const targetExists = await waitForGuideTarget(target);
    if (!targetExists) {
      throw new Error(`User guide could not find "${String(target)}" on ${currentPath()}`);
    }
  },
});

const getGuideSteps = (role: string, navigate: ReturnType<typeof useNavigate>): Step[] => {
  const currentPath = () => window.location.pathname;
  const steps = [
    routeStep(
      '/',
      '#guide-site-header',
      'ברוכים הבאים לאתר ההוצלא',
      ' כאן באתר תוכלו להזמין את כל עבודות הדפוס מהוצל"א  אמ"ן פקמ"ז',
      navigate,
      currentPath,
      'top'
    ),
    sidebarStep(
      '/',
      '#guide-sidebar-navigation-options',
      'תפריט הניווט',
      'הקישורים בתפריט הצד מובילים לעמודים הזמינים לתפקיד שלך. לחיצה על קישור משנה עמוד; המדריך יעשה זאת עבורך כשנלחץ „הבא“.',
      navigate,
      currentPath,
      'left'
    ),
    sidebarStep(
      '/',
      '#guide-sidebar-guide-button',
      'פתיחה חוזרת של המדריך',
      'אפשר לחזור לסיור בכל עת מהכפתור הזה. בתוך הסיור „הקודם“ חוזר להסבר הקודם, „הבא“ מתקדם — ובסיומו אפשר לסגור.',
      navigate,
      currentPath,
      'left'
    ),
    routeStep(
      '/',
      '#guide-catalog-heading',
      'קטלוג המוצרים',
      'זהו העמוד שממנו מתחילים להזמין. אפשר לעבור על ההיצע, לצמצם אותו לפי קטגוריה ולפתוח מוצר להתאמה.',
      navigate,
      currentPath
    ),
    routeStep(
      '/',
      '#guide-catalog-search',
      'חיפוש בקטלוג',
      'הקלדת שם, תיאור או קטגוריה מסננת את המוצרים תוך כדי כתיבה. מחיקת החיפוש מחזירה את כל התוצאות.',
      navigate,
      currentPath
    ),
    routeStep(
      '/',
      () =>
        document.querySelector<HTMLElement>('#guide-catalog-categories') ??
        document.querySelector<HTMLElement>('#guide-catalog-products'),
      'קטגוריות ובחירת מוצר',
      'לחיצה על „הכל“ או על קטגוריה מציגה קבוצה אחרת של מוצרים. לחיצה על כרטיס מוצר פותחת את מסך ההתאמה וההזמנה; מדריך זה יפתח את המוצר הראשון הזמין בשלב הבא.',
      navigate,
      currentPath,
      'top'
    ),
    {
      ...routeStep(
        '/',
        getProductPageTarget,
        'התאמת מוצר',
        'במסך זה בוחרים את הכמות ואת האפשרויות המוצגות למוצר. אפשר לצרף קובץ אם השדה מופיע, לעיין במחיר המחושב ולהוסיף את המוצר לעגלה. מדריך זה לא ישנה בחירות ולא ישלח הזמנה.',
        navigate,
        currentPath,
        'top'
      ),
      before: async () => {
        if (currentPath() !== '/') {
          navigate('/');
        }
        await waitForGuideTarget('#guide-catalog-products');

        const startedAt = Date.now();
        let productId =
          document.querySelector<HTMLElement>('[data-guide-product-id]')?.dataset.guideProductId;

        while (!productId && Date.now() - startedAt < 2500) {
          await new Promise((resolve) => window.setTimeout(resolve, 50));
          productId =
            document.querySelector<HTMLElement>('[data-guide-product-id]')?.dataset.guideProductId;
        }

        if (productId) {
          const path = `/product/${encodeURIComponent(productId)}`;
          navigate(path);
          const targetExists = await waitForGuideTarget(getProductPageTarget);
          if (!targetExists) {
            throw new Error('The product configuration page did not become available.');
          }
        }
      },
    },
    currentPageStep(
      () =>
        document.querySelector<HTMLElement>('#guide-product-form') ??
        document.querySelector<HTMLElement>('#guide-catalog-products'),
      'שדות והתאמת מוצר',
      'במסך המוצר ממלאים את השדות שמופיעים, משנים כמות, בוחרים אפשרויות ומצרפים קובץ אם נדרש. השדות משתנים בהתאם למוצר.',
      currentPath,
      'top'
    ),
    currentPageStep(
      () =>
        document.querySelector<HTMLElement>('#guide-product-price') ??
        document.querySelector<HTMLElement>('#guide-catalog-products'),
      'מחיר והוספה לעגלה',
      'כאן רואים את המחיר המחושב. אחרי מילוי השדות, „הוסף לעגלה“ שומר את הבחירה; המדריך לא מוסיף פריטים.',
      currentPath,
      'top'
    ),
  ];

  const navigationSteps: Step[] =
    role === 'REQUESTER'
      ? [
          sidebarStep(
            '/',
            '#guide-sidebar-nav-cart',
            'קיצור לעגלת הקניות',
            'הקישור „עגלת קניות“ פותח את הפריטים שבחרת. אפשר להגיע אליו גם מסמל העגלה בסרגל העליון.',
            navigate,
            currentPath,
            'left'
          ),
          sidebarStep(
            '/',
            '#guide-sidebar-nav-my-orders',
            'קיצור להזמנות שלך',
            'הקישור „ההזמנות שלי“ מציג הזמנות שכבר נשלחו, את הסטטוס שלהן ואת פרטי כל הזמנה.',
            navigate,
            currentPath,
            'left'
          ),
        ]
      : role === 'WORKER' || role === 'MANAGER'
        ? [
            sidebarStep(
              '/',
              '#guide-sidebar-nav-worker-queue',
              'קיצור לתור העבודה',
              'קישור זה זמין לעובדי דפוס ולמנהלים ומוביל לרשימת ההזמנות הפעילות שממתינות לטיפול.',
              navigate,
              currentPath,
              'left'
            ),
            sidebarStep(
              '/',
              '#guide-sidebar-nav-admin-orders',
              'קיצור לניהול הזמנות',
              'כאן עוברים לטבלת ההזמנות, מחפשים ומסננים אותן, ופותחים הזמנה לטיפול.',
              navigate,
              currentPath,
              'left'
            ),
            ...(role === 'MANAGER'
              ? [
                  sidebarStep(
                    '/',
                    '#guide-sidebar-nav-admin-builder',
                    'קיצור לבניית מוצר',
                    'הקישור „בניית מוצר (Admin)“ זמין למנהל ומאפשר להוסיף מוצר לקטלוג או לערוך מוצר קיים.',
                    navigate,
                    currentPath,
                    'left'
                  ),
                ]
              : []),
          ]
        : [];

  steps.splice(4, 0, ...navigationSteps);

  if (role === 'REQUESTER') {
    steps.push(
      routeStep(
        '/cart',
        () =>
          document.querySelector<HTMLElement>('#guide-cart-title') ??
          document.querySelector<HTMLElement>('#guide-cart-page'),
        'עגלת הקניות',
        'בעגלה אפשר לבדוק את המוצרים והאפשרויות שבחרת. כפתורי הכמות משנים מספר עותקים, וסמל המחיקה מסיר פריט לאחר אישור.',
        navigate,
        currentPath
      ),
      currentPageStep(
        () =>
          document.querySelector<HTMLElement>('#guide-cart-items') ??
          document.querySelector<HTMLElement>('#guide-cart-summary'),
        'כמות ומחיקת פריטים',
        'בכל שורת מוצר אפשר לשנות את הכמות בעזרת כפתורי הפלוס והמינוס. סמל הפח מבקש אישור לפני הסרת הפריט. אם העגלה ריקה, חוזרים לקטלוג ומוסיפים מוצר.',
        currentPath,
        'top'
      ),
      routeStep(
        '/cart',
        () =>
          document.querySelector<HTMLElement>('#guide-cart-summary-card') ??
          document.querySelector<HTMLElement>('#guide-cart-summary'),
        'סיכום והמשך',
        'כרטיס הסיכום מציג את סכום הפריטים ואת הסכום הכולל. „המשך לתשלום / אישור“ פותח את טופס פרטי המזמין; הוא פעיל רק כאשר יש פריטים בעגלה.',
        navigate,
        currentPath,
        'top'
      ),
      routeStep(
        '/checkout',
        '#guide-checkout-customer',
        'פרטי המזמין',
        'ממלאים שם, מייל ארגוני, טלפון ויחידה. אם הפרטים לא נטענו אוטומטית, אפשר להזין אותם ידנית. הודעות מתחת לשדות מסבירות מה צריך לתקן.',
        navigate,
        currentPath
      ),
      routeStep(
        '/checkout',
        '#guide-checkout-budget',
        'פרטי תקציב ואספקה',
        'מזינים את פרטי קצין התקציב המאשר, תאריך אספקה מבוקש והערות לבית הדפוס. בדיקת הטופס מוודאת שהשדות הנדרשים תקינים.',
        navigate,
        currentPath,
        'center'
      ),
      routeStep(
        '/checkout',
        '#guide-checkout-actions',
        'שליחה או חזרה לעגלה',
        '„חזרה לעגלה“ מאפשרת לתקן את הפריטים. „שלח לאישור תקציבי“ יוצר הזמנה ושולח אותה לאישור — המדריך לא לוחץ עליה. לאחר שליחה אמיתית יוצגו מספר ההזמנה וקישורים למעקב או חזרה לקטלוג.',
        navigate,
        currentPath
      ),
      routeStep(
        '/my-orders',
        '#guide-my-orders-title',
        'ההזמנות שלי',
        'כאן רואים מספר הזמנה, תאריך, סכום וסטטוס. לחיצה על שורה פותחת את פרטי אותה הזמנה.',
        navigate,
        currentPath
      ),
      {
        ...routeStep(
          '/my-orders',
          () =>
            document.querySelector<HTMLElement>('#guide-order-details') ??
            document.querySelector<HTMLElement>('#guide-my-orders-list'),
          'פרטי הזמנה',
          'כאן רואים את סטטוס ההזמנה, הפריטים, הקבצים ופרטי אנשי הקשר. אם אין עדיין הזמנה, אפשר לחזור לעמוד הזה בהמשך.',
          navigate,
          currentPath
        ),
        before: async () => {
          if (currentPath() !== '/my-orders') {
            navigate('/my-orders');
          }
          await waitForGuideTarget('#guide-my-orders-list');
          const startedAt = Date.now();
          let orderId =
            document.querySelector<HTMLElement>('[data-guide-order-id]')?.dataset.guideOrderId;

          while (!orderId && Date.now() - startedAt < 2500) {
            await new Promise((resolve) => window.setTimeout(resolve, 50));
            orderId =
              document.querySelector<HTMLElement>('[data-guide-order-id]')?.dataset.guideOrderId;
          }

          if (orderId) {
            const path = `/orders/${encodeURIComponent(orderId)}`;
            navigate(path);
            const targetExists = await waitForGuideTarget('#guide-order-details');
            if (!targetExists) {
              throw new Error('The order details page did not become available.');
            }
          }
        },
      }
    );
  }

  if (role === 'WORKER' || role === 'MANAGER') {
    steps.push(
      routeStep(
        '/worker/queue',
        '#guide-worker-queue-title',
        'תור עבודות פעילות',
        'כאן מוצגות הזמנות שאושרו וממתינות להפקה או שנמצאות בייצור. „רענן תור“ טוען מחדש את רשימת העבודות.',
        navigate,
        currentPath
      ),
      routeStep(
        '/worker/queue',
        '#guide-worker-refresh',
        'רענון תור העבודה',
        'לחיצה על „רענן תור“ טוענת מחדש את ההזמנות. בזמן הטעינה הכפתור מושבת כדי למנוע בקשות כפולות.',
        navigate,
        currentPath,
        'right'
      ),
      routeStep(
        '/worker/queue',
        '#guide-worker-queue-list',
        'טיפול בעבודה',
        'פתח כרטיס עבודה כדי לעבור לפרטי ההזמנה ולעדכן את הטיפול בה. שינוי סטטוס משפיע על מעקב ההזמנה של המזמין.',
        navigate,
        currentPath
      ),
      routeStep(
        '/admin/orders',
        '#guide-admin-orders-title',
        'ניהול ההזמנות',
        'הטבלה מציגה את כלל ההזמנות שהמשתמש מורשה לראות. לחיצה על שורה פותחת את ההזמנה, ואפשר למיין לפי כותרות העמודות.',
        navigate,
        currentPath
      ),
      routeStep(
        '/admin/orders',
        '#guide-admin-order-filters',
        'חיפוש וסינון הזמנות',
        'אפשר לחפש לפי פרטי הזמנה ולסנן לפי סטטוס. התוצאות מתעדכנות לפי תנאי החיפוש והמסנן; גלילה בהמשך הרשימה טוענת עוד הזמנות.',
        navigate,
        currentPath
      ),
      {
        ...routeStep(
          '/admin/orders',
          () =>
            document.querySelector<HTMLElement>('#guide-admin-order-actions') ??
            document.querySelector<HTMLElement>('#guide-admin-order-details') ??
            document.querySelector<HTMLElement>('#guide-admin-orders-table') ??
            document.querySelector<HTMLElement>('#guide-admin-orders-title'),
          'פרטי הזמנה ואישור',
          'בעמוד הפרטים בודקים את המידע והפריטים. למנהל יוצגו פעולות אישור או דחייה כשהן רלוונטיות; עובד יכול לעדכן את שלב הטיפול. אם אין הזמנות בטבלה, בחר אחת כשתופיע.',
          navigate,
          currentPath
        ),
        before: async () => {
          if (currentPath() !== '/admin/orders') {
            navigate('/admin/orders');
          }
          await waitForGuideTarget('#guide-admin-orders-title');
          const startedAt = Date.now();
          let orderId = document
            .querySelector<HTMLElement>('#guide-admin-orders-table [data-id]')
            ?.getAttribute('data-id');

          while (!orderId && Date.now() - startedAt < 2500) {
            await new Promise((resolve) => window.setTimeout(resolve, 50));
            orderId = document
              .querySelector<HTMLElement>('#guide-admin-orders-table [data-id]')
              ?.getAttribute('data-id');
          }

          if (orderId) {
            const path = `/admin/order/${encodeURIComponent(orderId)}`;
            navigate(path);
            const targetExists = await waitForGuideTarget(
              () =>
                document.querySelector<HTMLElement>('#guide-admin-order-details') ??
                document.querySelector<HTMLElement>('#guide-admin-orders-table') ??
                document.querySelector<HTMLElement>('#guide-admin-orders-title')
            );
            if (!targetExists) {
              throw new Error('The administrative order details page did not become available.');
            }
          }
        },
      }
    );
  }

  if (role === 'MANAGER') {
    steps.push(
      routeStep(
        '/admin/builder',
        '#guide-product-builder-page',
        'בניית מוצר',
        'ממשק הניהול מאפשר ליצור מוצר חדש או לערוך מוצר קיים. ממלאים את פרטי המוצר, מחיר ותמונה, ובוחרים קטגוריה.',
        navigate,
        currentPath
      ),
      routeStep(
        '/admin/builder',
        '#guide-product-builder-fields',
        'פרטי מוצר בסיסיים',
        'ממלאים שם, קטגוריה, תיאור ומחיר. אפשר להפעיל או להשבית מוצר ולהגדיר כמויות מינימום ומקסימום.',
        navigate,
        currentPath
      ),
      routeStep(
        '/admin/builder',
        '#guide-product-builder-attributes',
        'מאפיינים דינמיים',
        '„הוסף מאפיין“ מציע שדה בחירה, מספר, כן/לא או טקסט. אפשר לשנות את סדר השדות, להגדיר אפשרויות ותוספות מחיר; שדה העלאת קובץ נשאר קבוע בתחתית.',
        navigate,
        currentPath
      ),
      routeStep(
        '/admin/builder',
        '#guide-product-builder-save',
        'שמירת מוצר',
        '„הקם מוצר“ יוצר מוצר חדש, ו„שמור שינויים“ מעדכן מוצר קיים. לפני השמירה המערכת בודקת שדות חובה, מחיר, כמויות ומאפיינים.',
        navigate,
        currentPath
      )
    );
  }

  const managerPlacements: Partial<Record<number, Step['placement']>> = {
    11: 'right',
    12: 'right',
    13: 'right',
    14: 'right',
    19: 'right',
  };

  return steps.map((step, index) => {
    const managerPlacement = role === 'MANAGER' ? managerPlacements[index] : undefined;
    const workerPlacement = role === 'WORKER' && index === 13 ? 'right' : undefined;
    const isHorizontal =
      managerPlacement !== undefined ||
      workerPlacement !== undefined ||
      [9, 10, 12, 13, 18].includes(index);

    if (!isHorizontal) {
      return step;
    }

    return {
      ...step,
      id: `guide-horizontal-step-${index + 1}`,
      placement: managerPlacement ?? workerPlacement ?? (index === 13 ? 'left' : 'right'),
      isFixed: true,
      floatingOptions: {
        ...step.floatingOptions,
        strategy: 'fixed',
        flipOptions: false,
        shiftOptions: { padding: 12 },
      },
      ...(index === 9 ||
      index === 10 ||
      index === 18 ||
      (role === 'WORKER' && index === 13) ||
      (role === 'MANAGER' && [11, 12, 14, 19].includes(index))
        ? { width: 227 }
        : {}),
    };
  });
};

export const UserGuideProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [storageError, setStorageError] = useState(false);
  const [guideError, setGuideError] = useState(false);
  const appContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (appContentRef.current) {
      appContentRef.current.inert = isRunning;
    }
  }, [isRunning]);

  const reportStorageError = useCallback((error: unknown) => {
    console.error('Unable to access the user guide state in localStorage.', error);
    setStorageError(true);
  }, []);

  const hasSeenGuide = useCallback(() => {
    try {
      return window.localStorage.getItem(GUIDE_SEEN_KEY) === 'true';
    } catch (error) {
      reportStorageError(error);
      return false;
    }
  }, [reportStorageError]);

  const markGuideAsSeen = useCallback(() => {
    try {
      window.localStorage.setItem(GUIDE_SEEN_KEY, 'true');
    } catch (error) {
      reportStorageError(error);
    }
  }, [reportStorageError]);

  useEffect(() => {
    if (pathname === '/') {
      const timeoutId = window.setTimeout(() => {
        if (!hasSeenGuide()) {
          setIsWelcomeOpen(true);
        }
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [hasSeenGuide, pathname]);

  const steps = useMemo(
    () => getGuideSteps(currentUser.role, navigate),
    [currentUser.role, navigate]
  );

  const startGuide = useCallback(() => {
    setIsWelcomeOpen(false);
    if (pathname !== '/') {
      navigate('/');
    }
    setGuideError(false);
    setRunKey((current) => current + 1);
    setIsRunning(true);
  }, [navigate, pathname]);

  const startFirstVisitGuide = () => {
    markGuideAsSeen();
    startGuide();
  };

  const handleTourEvent = useCallback(
    (event: { status: string; type: string; error: Error | null }) => {
      if (event.status === 'finished' || event.status === 'skipped') {
        setIsRunning(false);
      }

      if (event.type === 'error' && event.error) {
        console.error('The user guide could not show a step.', event.error);
        setGuideError(true);
      }
    },
    []
  );

  return (
    <UserGuideContext.Provider value={{ startGuide }}>
      <div ref={appContentRef} data-guide-app-content style={{ display: 'contents' }}>
        {children}
      </div>
      <Joyride
        key={runKey}
        continuous
        run={isRunning}
        steps={steps}
        onEvent={handleTourEvent}
        tooltipComponent={GuideTooltip}
        locale={{
          back: 'הקודם',
          last: 'סיום',
          next: 'הבא',
          skip: 'דלג',
        }}
        options={{
          buttons: ['skip', 'back', 'primary'],
          blockTargetInteraction: true,
          overlayColor: 'rgba(0, 0, 0, 0.72)',
          overlayClickAction: false,
          primaryColor: '#005da7',
          skipBeacon: true,
          spotlightPadding: 8,
          zIndex: 2000,
        }}
        beaconComponent={() => null}
      />
      <Dialog
        open={isWelcomeOpen}
        onClose={() => {
          markGuideAsSeen();
          setIsWelcomeOpen(false);
        }}
        dir="rtl"
        aria-labelledby="user-guide-welcome-title"
      >
        <DialogTitle id="user-guide-welcome-title">ברוכים הבאים לאתר הוצלא</DialogTitle>
        <DialogContent>
          <DialogContentText>
            נדריך אותך בין עמודי האתר, נסביר על הכפתורים והפעולות, ונעבור לעמוד הבא בכל לחיצה על
            „הבא“.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              markGuideAsSeen();
              setIsWelcomeOpen(false);
            }}
            color="inherit"
          >
            דלג
          </Button>
          <Button onClick={startFirstVisitGuide} variant="contained" autoFocus>
            המשך
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={storageError} autoHideDuration={8000} onClose={() => setStorageError(false)}>
        <Alert severity="error" onClose={() => setStorageError(false)}>
          לא ניתן לשמור את מצב המדריך בדפדפן. אפשר להפעיל את המדריך בכל עת מתפריט הצד.
        </Alert>
      </Snackbar>
      <Snackbar open={guideError} autoHideDuration={8000} onClose={() => setGuideError(false)}>
        <Alert severity="error" onClose={() => setGuideError(false)}>
          לא הצלחנו להציג את אחד השלבים במדריך. אפשר לדלג לשלב הבא או להפעיל את המדריך שוב.
        </Alert>
      </Snackbar>
    </UserGuideContext.Provider>
  );
};
