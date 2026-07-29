import React from 'react';
import { Box, Chip, Menu, MenuItem, Typography } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useAuthStore, type UserRole, MOCK_USERS } from '../../store/useAuthStore';

export const DevUserSwitcher: React.FC = () => {
  const { currentUser, setRole } = useAuthStore();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  // בודק אם מופעל Mock Auth (ב-Vite)
  const isMockAuthEnabled = import.meta.env.VITE_ENABLE_MOCK_AUTH !== 'false';

  if (!isMockAuthEnabled) return null;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (role?: UserRole) => {
    if (role) {
      setRole(role);
    }
    setAnchorEl(null);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
      <Chip
        icon={<SwapHorizIcon />}
        label={`Dev Mode: ${currentUser.name}`}
        color="warning"
        variant="outlined"
        onClick={handleClick}
        sx={{ cursor: 'pointer', fontWeight: 'bold', bgcolor: 'rgba(255,152,0,0.1)' }}
      />
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => handleClose()}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            החלף זהות משתמש (Dev Only)
          </Typography>
        </Box>
        {(Object.keys(MOCK_USERS) as UserRole[]).map((role) => (
          <MenuItem
            key={role}
            selected={currentUser.role === role}
            onClick={() => handleClose(role)}
          >
            {MOCK_USERS[role].name} ({role})
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
