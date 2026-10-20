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
  Box,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BuildIcon from '@mui/icons-material/Build';
import LocalPrintshopIcon from '@mui/icons-material/LocalPrintshop';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import { useAuthStore } from '../../store/useAuthStore';
import { useUserGuide } from '../guide/UserGuideContext';
import growthLogo from '../../assets/logo-growth.png';
import lionLogo from '../../assets/logo-lion.png';
import crossedLogo from '../../assets/logo-crossed.png';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';

const DRAWER_WIDTH = 240;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { startGuide } = useUserGuide();

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
      text: 'תור עבודה',
      path: '/worker/queue',
      icon: <LocalPrintshopIcon />,
      show: isWorkerOrManager,
    },
    {
      text: 'ניהול הזמנות',
      path: '/admin/orders',
      icon: <AdminPanelSettingsIcon />,
      show: isWorkerOrManager,
    },
    { text: 'בניית מוצר (Admin)', path: '/admin/builder', icon: <BuildIcon />, show: isManager },
    {
      text: 'ניהול הרשאות',
      path: '/manager/roles',
      icon: <ManageAccountsIcon />,
      show: isManager,
    },
  ];

  return (
    <Drawer
      variant="permanent"
      anchor="left" // עיגון מימין עבור RTL
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        },
      }}
    >
      <Toolbar />
      <Divider />
      <List id="guide-sidebar-navigation-options" sx={{ flexGrow: 1 }}>
        {menuItems
          .filter((item) => item.show)
          .map((item) => {
            const isSelected = location.pathname === item.path;
            const targetId =
              item.path === '/'
                ? 'guide-sidebar-catalog'
                : `guide-sidebar-nav-${item.path.replace(/^\/+/, '').replaceAll('/', '-')}`;
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  id={targetId}
                  selected={isSelected}
                  onClick={() => navigate(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                      '& .MuiListItemText-primary': { color: 'inherit' },
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
      <Box
        id="guide-sidebar-logos"
        aria-label="לוגואים"
        sx={{
          display: 'flex',
          direction: 'ltr',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 1.5,
        }}
      >
        <Box
          component="img"
          src={lionLogo}
          alt="סמל האריה"
          sx={{ width: 58, height: 58, objectFit: 'contain' }}
        />
        <Box
          component="img"
          src={growthLogo}
          alt="סמל הצמיחה"
          sx={{ width: 66, height: 66, objectFit: 'contain', transform: 'translateY(-8px)' }}
        />
        <Box
          component="img"
          src={crossedLogo}
          alt="סמל האריה עם הפס האדום"
          sx={{ width: 58, height: 58, objectFit: 'contain' }}
        />
      </Box>
      <List disablePadding sx={{ pb: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            id="guide-sidebar-guide-button"
            onClick={startGuide}
            aria-label="מדריך למשתמש"
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'action.active' }}>
              <SchoolOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="מדריך למשתמש" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};
