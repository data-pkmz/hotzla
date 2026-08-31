import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Avatar, IconButton, Badge } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useQuery } from '@tanstack/react-query';
import QuickCartDrawer from '../cart/QuickCartDrawer';
import { getActiveCart } from '../../services/api/cart.service';
import { DevUserSwitcher } from './DevUserSwitcher';
import { useAuthStore } from '../../store/useAuthStore';

export const Header: React.FC = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: cart } = useQuery({
    queryKey: ['activeCart'],
    queryFn: getActiveCart,
  });

  const items = cart?.items || cart?.cartItemEntries || [];
  const cartItemsCount = items.length;

  return (
    <>
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
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 'bold', color: 'primary.main' }}
          >
            DPS - הוצאה לאור
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* רכיב החלפת משתמשים בפיתוח */}
          <DevUserSwitcher />

          {/* תצוגת פרטי משתמש */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2, ml: 2 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {currentUser.name.charAt(0)}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {currentUser.name}
            </Typography>
          </Box>

          {/* כפתור עגלת קניות */}
          <IconButton color="inherit" onClick={() => setIsDrawerOpen(true)}>
            <Badge badgeContent={cartItemsCount} color="error">
              <ShoppingCartIcon color="action" />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      <QuickCartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
};
