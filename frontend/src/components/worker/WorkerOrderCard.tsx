import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { Order } from 'shared-types';
import { startPrinting, readyForPickup, completeOrder } from '../../services/api/orders.service';
import StatusBadge from '../StatusBadge';

interface WorkerOrderCardProps {
  order: Order;
  onStatusUpdated: () => void;
}

export const WorkerOrderCard: React.FC<WorkerOrderCardProps> = ({ order, onStatusUpdated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: () => Promise<void>) => {
    try {
      setIsLoading(true);
      setError(null);
      await action();
      onStatusUpdated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('שגיאה בעדכון הסטטוס');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderActionButtons = () => {
    if (order.status === 'APPROVED_FOR_PRODUCTION') {
      return (
        <Button
          variant="contained"
          color="primary"
          fullWidth
          disabled={isLoading}
          onClick={() => handleAction(() => startPrinting(order.id))}
          sx={{ mt: 1 }}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'התחל הדפסה'}
        </Button>
      );
    }

    if (order.status === 'IN_PRODUCTION') {
      return (
        <Button
          variant="contained"
          color="success"
          fullWidth
          disabled={isLoading}
          onClick={() => handleAction(() => readyForPickup(order.id))}
          sx={{ mt: 1 }}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'סיים - מוכן לאיסוף'}
        </Button>
      );
    }

    if (order.status === 'READY_FOR_PICKUP') {
      return (
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          disabled={isLoading}
          onClick={() => handleAction(() => completeOrder(order.id))}
          sx={{ mt: 1 }}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'סמן כנמסר'}
        </Button>
      );
    }

    return null;
  };

  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requesterName =
    (order as any).requester?.fullName || (order as any).requesterName || 'לא ידוע';
  const unit = order.unit ? `(${order.unit})` : '';

  return (
    <Card sx={{ mb: 3, boxShadow: 2, textAlign: 'right' }} dir="rtl">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography
            variant="h6"
            fontWeight="bold"
            color="primary"
            sx={{
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': { textDecoration: 'underline' },
            }}
            onClick={() =>
              navigate(`/orders/${order.id}`, {
                state: { from: '/worker/queue', fromLabel: 'תור עבודה' },
              })
            }
          >
            הזמנה #{order.orderNumber}
            <ArrowBackIcon fontSize="small" />
          </Typography>
          <StatusBadge status={order.status} />
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box mb={1} display="flex" alignItems="center" gap={1}>
          <Typography variant="body1" fontWeight="bold">
            מזמין:
          </Typography>
          <Typography variant="body1">
            {requesterName} {unit}
          </Typography>
        </Box>
        <Box mb={2} display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" fontWeight="bold" color="text.secondary">
            תאריך פתיחה:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(order.createdAt).toLocaleDateString('he-IL')}
          </Typography>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>{renderActionButtons()}</CardActions>
    </Card>
  );
};

export default WorkerOrderCard;
