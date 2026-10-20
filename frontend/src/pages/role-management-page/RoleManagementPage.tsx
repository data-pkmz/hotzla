import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AssignableUserRole, RoleManagementUser, UserRole } from 'shared-types';

import {
  getUsersForRoleManagement,
  updateUserRole,
} from '../../services/api/user-management.service';

type RoleFilter = 'ALL' | UserRole;

interface PendingRoleChange {
  user: RoleManagementUser;
  newRole: AssignableUserRole;
}

interface NotificationState {
  message: string;
  severity: 'success' | 'error';
}

const roleLabels: Record<UserRole, string> = {
  REQUESTER: 'מבקש',
  WORKER: 'עובד',
  MANAGER: 'מנהל',
};

function getRoleChipColor(role: UserRole): 'default' | 'primary' | 'success' {
  switch (role) {
    case 'MANAGER':
      return 'primary';
    case 'WORKER':
      return 'success';
    default:
      return 'default';
  }
}

export default function RoleManagementPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  const [pendingChange, setPendingChange] = useState<PendingRoleChange | null>(null);

  const [notification, setNotification] = useState<NotificationState | null>(null);

  /**
   * Retrieve active users.
   */
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['role-management-users'],
    queryFn: getUsersForRoleManagement,
  });

  /**
   * Update a user's role.
   */
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AssignableUserRole }) =>
      updateUserRole(userId, role),

    onSuccess: async (result) => {
      setPendingChange(null);

      setNotification({
        severity: 'success',
        message: `התפקיד של ${
          result.user.fullName || result.user.adUsername
        } עודכן בהצלחה ל${roleLabels[result.user.role]}`,
      });

      await queryClient.invalidateQueries({
        queryKey: ['role-management-users'],
      });
    },

    onError: (mutationError: Error) => {
      setNotification({
        severity: 'error',
        message: mutationError.message || 'שגיאה בעדכון תפקיד המשתמש',
      });
    },
  });

  /**
   * Filter users locally by search and role.
   */
  const filteredUsers = useMemo(() => {
    const users = data?.users ?? [];
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return users.filter((user) => {
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

      const searchableFields = [user.fullName, user.adUsername, user.militaryEmail, user.unit];

      const matchesSearch =
        !normalizedSearch ||
        searchableFields.some((field) =>
          (field ?? '').toLocaleLowerCase().includes(normalizedSearch)
        );

      return matchesRole && matchesSearch;
    });
  }, [data?.users, search, roleFilter]);

  const users = data?.users ?? [];

  const workerCount = users.filter((user) => user.role === 'WORKER').length;

  const requesterCount = users.filter((user) => user.role === 'REQUESTER').length;

  /**
   * Open the confirmation dialog.
   */
  const handleRoleChange = (user: RoleManagementUser, newRole: AssignableUserRole) => {
    if (user.role === 'MANAGER') {
      return;
    }

    setPendingChange({ user, newRole });
  };

  /**
   * Confirm the selected role change.
   */
  const handleConfirmChange = () => {
    if (!pendingChange || updateRoleMutation.isPending) {
      return;
    }

    updateRoleMutation.mutate({
      userId: pendingChange.user.id,
      role: pendingChange.newRole,
    });
  };

  const handleCloseDialog = () => {
    if (!updateRoleMutation.isPending) {
      setPendingChange(null);
    }
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  return (
    <Box
      dir="rtl"
      sx={{
        p: { xs: 2, md: 3 },
        width: '100%',
        maxWidth: 1400,
        mx: 'auto',
      }}
    >
      {/* Page header */}
      <Stack direction="row" alignItems="center" spacing={1.5} useFlexGap sx={{ mb: 1 }}>
        <ManageAccountsIcon color="primary" fontSize="large" />

        <Typography variant="h4" fontWeight={700}>
          ניהול הרשאות משתמשים
        </Typography>
      </Stack>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        ניהול הרשאות עובדים במערכת. ניתן להעניק או להסיר הרשאת עובד ממשתמשים קיימים. הרשאות מנהל
        אינן ניתנות לשינוי דרך המערכת.
      </Typography>

      {/* Summary */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          divider={
            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: 'none', sm: 'block' } }}
            />
          }
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              סך משתמשים
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {users.length}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              מבקשים
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {requesterCount}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              עובדים
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {workerCount}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Search and filtering */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <TextField
            fullWidth
            size="small"
            label="חיפוש משתמש"
            placeholder="חיפוש לפי שם, שם משתמש, מייל או יחידה"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <Select
            size="small"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            inputProps={{ 'aria-label': 'סינון לפי תפקיד' }}
            MenuProps={{
              PaperProps: {
                dir: 'ltr',
                sx: {
                  direction: 'ltr',
                  '& .MuiMenuItem-root': {
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                  },
                },
              },
            }}
            sx={{
              minWidth: 180,
              direction: 'ltr',
              textAlign: 'left',
              '& .MuiSelect-select': {
                textAlign: 'left',
                paddingRight: '14px',
                paddingLeft: '32px',
              },
              '& .MuiSelect-icon': {
                right: 'auto',
                left: 7,
              },
            }}
          >
            <MenuItem value="ALL">כל התפקידים</MenuItem>
            <MenuItem value="REQUESTER">מבקשים</MenuItem>
            <MenuItem value="WORKER">עובדים</MenuItem>
            <MenuItem value="MANAGER">מנהלים</MenuItem>
          </Select>
        </Stack>
      </Paper>

      {/* Loading */}
      {isLoading && (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 250 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetch()}>
              נסה שוב
            </Button>
          }
        >
          {error instanceof Error ? error.message : 'שגיאה בטעינת המשתמשים'}
        </Alert>
      )}

      {/* User table */}
      {!isLoading && !isError && (
        <Paper variant="outlined">
          <TableContainer dir="ltr">
            <Table
              dir="ltr"
              sx={{
                minWidth: 760,
                direction: 'ltr',
                '& .MuiTableCell-root': {
                  textAlign: 'left',
                  direction: 'ltr',
                },
              }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: 'action.hover',
                  }}
                >
                  <TableCell align="right">שם מלא</TableCell>
                  <TableCell align="right">שם משתמש</TableCell>
                  <TableCell align="right">מייל צבאי</TableCell>
                  <TableCell align="right">יחידה</TableCell>
                  <TableCell align="right">תפקיד</TableCell>
                  <TableCell align="right">פעולות</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    hover
                    sx={{
                      '&:last-child td': {
                        borderBottom: 0,
                      },
                    }}
                  >
                    <TableCell align="right">
                      <Typography fontWeight={500}>{user.fullName || 'לא הוזן'}</Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography variant="body2" dir="ltr" sx={{ textAlign: 'left' }}>
                        {user.adUsername}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography variant="body2" dir="ltr" sx={{ textAlign: 'left' }}>
                        {user.militaryEmail || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">{user.unit || '—'}</TableCell>

                    <TableCell align="right">
                      <Chip
                        label={roleLabels[user.role]}
                        color={getRoleChipColor(user.role)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell align="right">
                      {user.role === 'REQUESTER' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<PersonAddAlt1Icon />}
                          disabled={updateRoleMutation.isPending}
                          onClick={() => handleRoleChange(user, 'WORKER')}
                        >
                          הענק הרשאת עובד
                        </Button>
                      )}

                      {user.role === 'WORKER' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          startIcon={<PersonRemoveIcon />}
                          disabled={updateRoleMutation.isPending}
                          onClick={() => handleRoleChange(user, 'REQUESTER')}
                        >
                          הסר הרשאת עובד
                        </Button>
                      )}

                      {user.role === 'MANAGER' && (
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ color: 'text.disabled' }}
                        >
                          <LockOutlinedIcon fontSize="small" />
                          <Typography variant="body2">לא ניתן לשינוי</Typography>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        לא נמצאו משתמשים התואמים לחיפוש
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              מוצגים {filteredUsers.length} מתוך {users.length} משתמשים
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Confirmation dialog */}
      <Dialog
        open={Boolean(pendingChange)}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="xs"
        aria-labelledby="role-change-dialog-title"
      >
        <Box dir="rtl">
          <DialogTitle id="role-change-dialog-title">אישור שינוי הרשאות</DialogTitle>

          <DialogContent>
            <DialogContentText>
              האם ברצונך{' '}
              {pendingChange?.newRole === 'WORKER' ? 'להעניק הרשאת עובד' : 'להסיר את הרשאת העובד'}{' '}
              עבור <strong>{pendingChange?.user.fullName || pendingChange?.user.adUsername}</strong>
              ?
            </DialogContentText>

            <Alert severity="info" sx={{ mt: 2 }}>
              {pendingChange?.newRole === 'WORKER'
                ? 'המשתמש יקבל גישה לפעולות המיועדות לעובדים.'
                : 'המשתמש יאבד את הגישה לפעולות המיועדות לעובדים ויחזור לתפקיד מבקש.'}
            </Alert>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseDialog} disabled={updateRoleMutation.isPending}>
              ביטול
            </Button>

            <Button
              variant="contained"
              color={pendingChange?.newRole === 'WORKER' ? 'primary' : 'warning'}
              onClick={handleConfirmChange}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? 'מעדכן...' : 'אישור שינוי'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={5000}
        onClose={handleCloseNotification}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <Alert
          severity={notification?.severity ?? 'success'}
          onClose={handleCloseNotification}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
