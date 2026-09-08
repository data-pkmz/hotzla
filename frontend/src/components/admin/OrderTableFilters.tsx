import { Box, Chip, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

import type { OrderStatus } from 'shared-types';

interface OrderTableFiltersProps {
  selectedStatus?: OrderStatus;
  onStatusChange: (status?: OrderStatus) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

interface StatusFilter {
  status: OrderStatus;
  label: string;
  color: string;
}

const STATUS_FILTERS: StatusFilter[] = [
  {
    status: 'PENDING_BUDGET',
    label: 'ממתין לאישור תקציבי',
    color: '#ff9800',
  },
  {
    status: 'PENDING_MANAGER_APPROVAL',
    label: 'אושר תקציבית',
    color: '#2196f3',
  },
  {
    status: 'APPROVED_FOR_PRODUCTION',
    label: 'אושר לביצוע',
    color: '#4caf50',
  },
  {
    status: 'IN_PRODUCTION',
    label: 'בהדפסה',
    color: '#00bcd4',
  },
  {
    status: 'READY_FOR_PICKUP',
    label: 'מוכן לאיסוף',
    color: '#9c27b0',
  },
  {
    status: 'COMPLETED',
    label: 'הושלם',
    color: '#4caf50',
  },
  {
    status: 'REJECTED_BUDGET',
    label: 'נדחה תקציבית',
    color: '#f44336',
  },
  {
    status: 'REJECTED_MANAGER',
    label: 'נדחה על ידי מנהל',
    color: '#f44336',
  },
];

export default function OrderTableFilters({
  selectedStatus,
  onStatusChange,
  search,
  onSearchChange,
}: OrderTableFiltersProps) {
  return (
    <Box
      sx={{
        mb: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Chip
          label="הכל"
          clickable
          variant={selectedStatus === undefined ? 'filled' : 'outlined'}
          onClick={() => onStatusChange(undefined)}
          sx={{
            fontWeight: 600,
          }}
        />

        {STATUS_FILTERS.map(({ status, label, color }) => {
          const selected = selectedStatus === status;

          return (
            <Chip
              key={status}
              label={label}
              clickable
              onClick={() => onStatusChange(selected ? undefined : status)}
              variant={selected ? 'filled' : 'outlined'}
              sx={{
                borderColor: color,
                bgcolor: selected ? color : 'transparent',
                color: selected ? '#fff' : color,
                fontWeight: 600,

                '&:hover': {
                  bgcolor: selected ? color : `${color}14`,
                },
              }}
            />
          );
        })}
      </Box>

      <TextField
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="חיפוש לפי מספר הזמנה או שם מזמין"
        size="small"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
        sx={{
          maxWidth: 500,
        }}
      />
    </Box>
  );
}
