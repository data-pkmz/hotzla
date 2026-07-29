import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import prefixer from 'stylis-plugin-rtl';
import rtlPlugin from 'stylis-plugin-rtl';

import { theme } from './theme/theme';
import { MainLayout } from './components/layout/MainLayout';
import { AppRoutes } from './routes/AppRoutes';

// הגדרת קאש עבור כיווניות RTL
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const queryClient = new QueryClient();

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider value={cacheRtl}>
        <ThemeProvider theme={theme}>
          <BrowserRouter>
            <MainLayout>
              <AppRoutes />
            </MainLayout>
          </BrowserRouter>
        </ThemeProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
};

export default App;
