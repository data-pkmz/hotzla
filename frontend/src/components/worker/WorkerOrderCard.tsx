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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { OrderStatus } from 'shared-types';
import type { Order } from 'shared-types';
import { startPrinting, readyForPickup, completeOrder } from '../../services/api/orders.service';
import StatusBadge from '../StatusBadge';

interface WorkerOrderCardProps {
  order: Order;
  onStatusUpdated: () => void;
  demoOnly?: boolean;
}

type ConfirmationType = 'START_PRINTING' | 'READY_FOR_PICKUP' | 'COMPLETE_ORDER' | null;

export const WorkerOrderCard: React.FC<WorkerOrderCardProps> = ({
  order,
  onStatusUpdated,
  demoOnly = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmType, setConfirmType] = useState<ConfirmationType>(null);
  const [pickupInstructions, setPickupInstructions] = useState('');

  const openConfirmation = (type: ConfirmationType) => {
    if (isLoading) return;
    setError(null);
    if (type === 'READY_FOR_PICKUP') {
      setPickupInstructions(order.pickupInstructions || '');
    }
    setConfirmType(type);
  };

  const closeConfirmation = () => {
    if (isLoading) return;
    setConfirmType(null);
  };

  const handleConfirm = async () => {
    if (!confirmType || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      if (confirmType === 'START_PRINTING') {
        await startPrinting(order.id);
      } else if (confirmType === 'READY_FOR_PICKUP') {
        await readyForPickup(order.id, pickupInstructions);
      } else if (confirmType === 'COMPLETE_ORDER') {
        await completeOrder(order.id);
      }

      setConfirmType(null);
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
    if (demoOnly) return null;

    if (order.status === OrderStatus.APPROVED_FOR_PRODUCTION) {
      return (
        <Button
          variant="contained"
          color="primary"
          fullWidth
          disabled={isLoading}
          onClick={() => openConfirmation('START_PRINTING')}
          sx={{ mt: 1 }}
        >
          התחל הדפסה
        </Button>
      );
    }

    if (order.status === OrderStatus.IN_PRODUCTION) {
      return (
        <Button
          variant="contained"
          color="success"
          fullWidth
          disabled={isLoading}
          onClick={() => openConfirmation('READY_FOR_PICKUP')}
          sx={{ mt: 1 }}
        >
          סיים - מוכן לאיסוף
        </Button>
      );
    }

    if (order.status === OrderStatus.READY_FOR_PICKUP) {
      return (
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          disabled={isLoading}
          onClick={() => openConfirmation('COMPLETE_ORDER')}
          sx={{ mt: 1 }}
        >
          סמן כנמסר
        </Button>
      );
    }

    return null;
  };

  const navigate = useNavigate();
  const requesterName = order.requester?.fullName || 'לא ידוע';
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
              cursor: demoOnly ? 'default' : 'pointer',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              ...(!demoOnly && { '&:hover': { textDecoration: 'underline' } }),
            }}
            onClick={
              demoOnly
                ? undefined
                : () =>
                    navigate(`/orders/${order.id}`, {
                      state: { from: '/worker/queue', fromLabel: 'תור עבודה' },
                    })
            }
          >
            הזמנה #{order.orderNumber}
            {!demoOnly && <ArrowBackIcon fontSize="small" />}
          </Typography>
          <StatusBadge status={order.status} />
        </Box>
        {demoOnly && (
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            מידע פיקטיבי לדוגמה
          </Typography>
        )}
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

      {/* Confirmation Dialog */}
      <Dialog
        open={Boolean(confirmType)}
        onClose={() => !isLoading && closeConfirmation()}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            textAlign: 'left',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'left' }}>
          {confirmType === 'START_PRINTING' && 'התחלת הדפסה'}
          {confirmType === 'READY_FOR_PICKUP' && 'סימון הזמנה כמוכנה לאיסוף'}
          {confirmType === 'COMPLETE_ORDER' && 'אישור מסירת הזמנה'}
        </DialogTitle>

        <DialogContent dir="rtl" sx={{ textAlign: 'left' }}>
          {confirmType === 'START_PRINTING' && (
            <DialogContentText sx={{ textAlign: 'left' }}>
              האם אתה בטוח שברצונך להתחיל בהדפסת הזמנה <bdi>#{order.orderNumber}</bdi>?
            </DialogContentText>
          )}

          {confirmType === 'READY_FOR_PICKUP' && (
            <Box sx={{ textAlign: 'left' }}>
              <DialogContentText sx={{ mb: 2, textAlign: 'left' }}>
                הזמנה <bdi>#{order.orderNumber}</bdi> תסומן כמוכנה לאיסוף, ותישלח הודעה למזמין:{' '}
                {requesterName}.
              </DialogContentText>
              <TextField
                label="הנחיות איסוף למזמין (אופציונלי)"
                placeholder="לדוגמה: ניתן לאסוף מבית הדפוס, חדר 104 בין השעות 08:30-16:00"
                helperText="הנחיות אלו יוצגו למזמין בעמוד ההזמנות ויישלחו במייל העדכון."
                multiline
                rows={3}
                fullWidth
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
                disabled={isLoading}
                sx={{
                  mt: 1,
                  textAlign: 'left',
                  '& .MuiInputBase-input': {
                    textAlign: 'left',
                  },
                  '& .MuiFormHelperText-root': {
                    textAlign: 'left',
                  },
                }}
              />
            </Box>
          )}

          {confirmType === 'COMPLETE_ORDER' && (
            <DialogContentText sx={{ textAlign: 'left' }}>
              האם אתה בטוח שברצונך לסמן את הזמנה <bdi>#{order.orderNumber}</bdi> כהושלמה ונמסרה
              למזמין?
            </DialogContentText>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{
                mt: 2,
                textAlign: 'left',
                '& .MuiAlert-message': { textAlign: 'left', width: '100%' },
              }}
            >
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 2, justifyContent: 'flex-start' }}>
          <Button onClick={closeConfirmation} disabled={isLoading} color="inherit" sx={{ px: 2 }}>
            ביטול
          </Button>

          {confirmType === 'START_PRINTING' && (
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              variant="contained"
              color="primary"
              sx={{ px: 2.5 }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : 'התחל הדפסה'}
            </Button>
          )}

          {confirmType === 'READY_FOR_PICKUP' && (
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              variant="contained"
              color="success"
              sx={{ px: 2.5 }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : 'אשר וסמן כמוכן'}
            </Button>
          )}

          {confirmType === 'COMPLETE_ORDER' && (
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              variant="contained"
              color="secondary"
              sx={{ px: 2.5 }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : 'סמן כנמסר'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default WorkerOrderCard;
