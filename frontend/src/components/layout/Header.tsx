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
      <Toolbar>
        <PrintIcon sx={{ color: 'primary.main', mr: 1, ml: 1 }} />
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          DPS - הוצאה לאור
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {/* רכיב החלפת משתמשים בפיתוח */}
        <DevUserSwitcher />

        {/* פרטי משתמש נוכחי */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            {currentUser.name.charAt(0)}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {currentUser.name}
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
