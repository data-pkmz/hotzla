import React from 'react';
import type { OrderStatus } from 'shared-types';

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  PENDING_BUDGET: { label: 'ממתין לאישור תקציבי', color: '#ff9800' },
  PENDING_MANAGER_APPROVAL: { label: 'אושר תקציבית', color: '#2196f3' },
  APPROVED_FOR_PRODUCTION: { label: 'אושר לביצוע', color: '#4caf50' },
  IN_PRODUCTION: { label: 'בהדפסה', color: '#00bcd4' },
  READY_FOR_PICKUP: { label: 'מוכן לאיסוף', color: '#9c27b0' },
  COMPLETED: { label: 'הושלם', color: '#4caf50' },
  REJECTED_BUDGET: { label: 'נדחה תקציבית', color: '#f44336' },
  REJECTED_MANAGER: { label: 'נדחה על ידי מנהל', color: '#f44336' },
  CANCELLED: { label: 'בוטל', color: '#9e9e9e' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];
  return (
    <span
      className="status-badge"
      style={{
        backgroundColor: config.color,
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '0.85em',
        fontWeight: 'bold',
        display: 'inline-block',
      }}
    >
      {config.label}
    </span>
  );
};
export default StatusBadge;
