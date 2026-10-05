import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';
import type { OrderStatus } from 'shared-types';

interface StatusStyle {
  label: string;
  backgroundColor: string;
  color: string;
}

const statusStyles: Record<OrderStatus, StatusStyle> = {
  PENDING_BUDGET: {
    label: 'ממתין לאישור תקציבי',
    backgroundColor: '#ffedd5',
    color: '#9a3412',
  },
  PENDING_MANAGER_APPROVAL: {
    label: 'ממתין לאישור מנהל',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  APPROVED_FOR_PRODUCTION: {
    label: 'אושר לביצוע',
    backgroundColor: '#bae6fd',
    color: '#0c4a6e',
  },
  IN_PRODUCTION: {
    label: 'בהדפסה',
    backgroundColor: '#f3e8ff',
    color: '#6b21a8',
  },
  READY_FOR_PICKUP: {
    label: 'מוכן לאיסוף',
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  COMPLETED: {
    label: 'הושלם',
    backgroundColor: '#166534',
    color: '#ffffff',
  },
  REJECTED_BUDGET: {
    label: 'נדחה תקציבית',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  REJECTED_MANAGER: {
    label: 'נדחה על ידי מנהל',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  CANCELLED: {
    label: 'בוטל',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
};

export type StatusBadgeProps = Omit<ChipProps, 'label' | 'color'> & {
  status: OrderStatus;
};

export default function StatusBadge({ status, sx, ...props }: StatusBadgeProps) {
  const style = statusStyles[status];

  return (
    <Chip
      {...props}
      label={style.label}
      sx={{
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontWeight: 700,
        '& .MuiChip-label': {
          px: 1.25,
        },
        ...sx,
      }}
    />
  );
}
