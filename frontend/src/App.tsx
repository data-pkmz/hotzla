import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import prefixer from 'stylis-plugin-rtl';
import rtlPlugin from 'stylis-plugin-rtl';

import { theme } from './theme/theme';
import { CatalogPage } from './pages/catalog';
import { ProductDetailPage } from './pages/product-detail';
import { CartPage } from './pages/cart';
import { CheckoutPage } from './pages/checkout';
import { MyOrdersPage } from './pages/my-orders';
import { OrdersTablePage } from './pages/admin/orders-table';
import { OrderDetailPage } from './pages/admin/order-detail';
import { ProductBuilderPage } from './pages/admin/product-builder';

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider value={cacheRtl}>
        <ThemeProvider theme={theme}>
          <Router>
            <div dir="rtl" style={{ fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
              <nav style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                <Link to="/">קטלוג</Link>
                <Link to="/product/1">פרטי מוצר</Link>
                <Link to="/cart">עגלה</Link>
                <Link to="/checkout">קופה</Link>
                <Link to="/my-orders">ההזמנות שלי</Link>
                <Link to="/admin/orders">ניהול הזמנות (אדמין)</Link>
                <Link to="/admin/builder">בונה מוצר (אדמין)</Link>
              </nav>

              <Routes>
                <Route path="/" element={<CatalogPage />} />
                <Route path="/product/:id" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/my-orders" element={<MyOrdersPage />} />
                <Route path="/admin/orders" element={<OrdersTablePage />} />
                <Route path="/admin/order/:id" element={<OrderDetailPage />} />
                <Route path="/admin/builder" element={<ProductBuilderPage />} />
              </Routes>
            </div>
          </Router>
        </ThemeProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
}

export default App;
