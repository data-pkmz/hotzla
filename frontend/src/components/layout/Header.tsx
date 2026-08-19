import React from 'react';
import { AppBar, Toolbar, Typography, Box, Avatar } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { DevUserSwitcher } from './DevUserSwitcher';
import { useAuthStore } from '../../store/useAuthStore';

export const Header: React.FC = () => {
  const currentUser = useAuthStore((state) => state.currentUser);

  return (
    <AppBar
      position="fixed"
      elevation={1}
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ position: 'relative', direction: 'rtl', pr: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <PrintIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'primary.main', whiteSpace: 'nowrap' }}>
            DPS - הוצאה לאור
          </Typography>
        </Box>

        <Box sx={{ display: { xs: 'none', sm: 'flex' }, direction: 'ltr', alignItems: 'center', gap: 2, position: 'absolute', left: { sm: 24, md: 32 }, top: '50%', transform: 'translateY(-50%)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {currentUser.name.charAt(0)}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
              {currentUser.name}
            </Typography>
          </Box>
          <DevUserSwitcher />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
