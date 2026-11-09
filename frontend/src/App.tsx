import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';

import { theme } from './theme/theme';
import { rtlCache } from './theme/rtlCache';
import { MainLayout } from './components/layout/MainLayout';
import { UserGuideProvider } from './components/guide/UserGuideProvider';
import { AppRoutes } from './routes/AppRoutes';

const queryClient = new QueryClient();

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider value={rtlCache}>
        <ThemeProvider theme={theme}>
          <BrowserRouter>
            <UserGuideProvider>
              <MainLayout>
                <AppRoutes />
              </MainLayout>
            </UserGuideProvider>
          </BrowserRouter>
        </ThemeProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
};

export default App;
