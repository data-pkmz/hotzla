import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BuildIcon from '@mui/icons-material/Build';
import { useAuthStore } from '../../store/useAuthStore';

const DRAWER_WIDTH = 240;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.currentUser);

  const isManager = currentUser.role === 'MANAGER';
  const isWorkerOrManager = currentUser.role === 'WORKER' || currentUser.role === 'MANAGER';

  const menuItems = [
    { text: 'קטלוג מוצרים', path: '/', icon: <StorefrontIcon />, show: true },
    {
      text: 'עגלת קניות',
      path: '/cart',
      icon: <ShoppingCartIcon />,
      show: currentUser.role === 'REQUESTER',
    },
    {
      text: 'ההזמנות שלי',
      path: '/my-orders',
      icon: <ListAltIcon />,
      show: currentUser.role === 'REQUESTER',
    },
    {
      text: 'ניהול הזמנות',
      path: '/admin/orders',
      icon: <AdminPanelSettingsIcon />,
      show: isWorkerOrManager,
    },
    { text: 'בונה מוצר (Admin)', path: '/admin/builder', icon: <BuildIcon />, show: isManager },
  ];

  return (
    <Drawer
      variant="permanent"
<<<<<<< HEAD
      anchor="left" // עיגון מימין עבור RTL
=======
      anchor="right" // עיגון מימין עבור RTL
>>>>>>> 8a3a984 (feat: add initial layout components and RTL cache)
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <Divider />
      <List>
        {menuItems
          .filter((item) => item.show)
          .map((item) => {
            const isSelected = location.pathname === item.path;
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => navigate(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{ minWidth: 40, color: isSelected ? 'inherit' : 'action.active' }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            );
          })}
      </List>
    </Drawer>
  );
};
