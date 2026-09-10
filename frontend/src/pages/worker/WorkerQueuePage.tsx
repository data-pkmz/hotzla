import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, CircularProgress, Alert, Button, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { Order, OrderStatus } from 'shared-types';
import { getOrders } from '../../services/api/orders.service';
import { WorkerOrderCard } from '../../components/worker/WorkerOrderCard';

export const WorkerQueuePage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = async (showLoadingState = true) => {
    try {
      if (showLoadingState) setIsLoading(true);
      setError(null);

      const [approvedRes, inProductionRes] = await Promise.all([
        getOrders({ status: 'APPROVED_FOR_PRODUCTION' as OrderStatus, limit: 100 }),
        getOrders({ status: 'IN_PRODUCTION' as OrderStatus, limit: 100 }),
      ]);

      const combinedOrders = [...approvedRes.orders, ...inProductionRes.orders];

      combinedOrders.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setOrders(combinedOrders);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('שגיאה בטעינת תור העבודה');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueue(false);
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4, textAlign: 'right' }} dir="rtl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          תור עבודות פעילות
        </Typography>
        <Button
          onClick={() => fetchQueue(true)}
          variant="outlined"
          color="primary"
          disabled={isLoading}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <RefreshIcon />
          רענן תור
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 8,
            textAlign: 'center',
            bgcolor: 'grey.50',
            border: '1px dashed',
            borderColor: 'grey.300',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" color="text.primary" gutterBottom>
            אין עבודות בתור
          </Typography>
          <Typography variant="body1" color="text.secondary">
            כל ההזמנות טופלו בהצלחה. אין כרגע עבודות הממתינות להדפסה.
          </Typography>
        </Paper>
      ) : (
        <Box display="flex" flexDirection="column" gap={1}>
          {orders.map((order) => (
            <WorkerOrderCard
              key={order.id}
              order={order}
              onStatusUpdated={() => fetchQueue(true)}
            />
          ))}
        </Box>
      )}
    </Container>
  );
};

export default WorkerQueuePage;
