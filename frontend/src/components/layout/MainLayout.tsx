import React from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 240;

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />
      <Header />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          minWidth: 0,
          minHeight: '100vh',
          ml: { xs: 0, sm: `${DRAWER_WIDTH}px` },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          overflow: 'hidden',
        }}
      >
        <Toolbar sx={{ flexShrink: 0 }} />
        <Box sx={{ width: '100%', maxWidth: 1440, minWidth: 0, flex: 1, overflow: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
};
