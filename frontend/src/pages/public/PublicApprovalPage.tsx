import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Container,
  Stack,
  Paper,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { apiFetch } from '../../services/api';

export const PublicApprovalPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch order info securely using the token
  const {
    data: orderData,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['public-approval-info', token],
    queryFn: async () => {
      if (!token) throw new Error('אין טוקן בכתובת (Missing token)');
      const res = await apiFetch(`/api/public/approval-info/${token}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'שגיאה בטעינת נתוני ההזמנה');
      }
      return res.json();
    },
    enabled: !!token && !successMessage,
    retry: false,
  });

  // Mutation to approve or reject
  const actionMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: 'APPROVE' | 'REJECT'; reason?: string }) => {
      const res = await apiFetch('/api/public/approve-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action, rejectReason: reason }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'שגיאה בשמירת ההחלטה');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSuccessMessage(data.message || 'הפעולה בוצעה בהצלחה!');
    },
  });

  if (!token) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Alert severity="error">קישור לא חוקי. חסר טוקן אישור.</Alert>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (fetchError || actionMutation.isError) {
    const errorMsg = fetchError ? fetchError.message : actionMutation.error?.message;
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Alert severity="error" variant="filled" sx={{ fontSize: '1.2rem', py: 2 }}>
          {errorMsg}
        </Alert>
      </Container>
    );
  }

  if (successMessage) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Paper elevation={3} sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            תודה רבה!
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {successMessage}
          </Typography>
        </Paper>
      </Container>
    );
  }

  const order = orderData?.order;

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 10 }} dir="rtl">
      <Card elevation={4} sx={{ borderRadius: 3 }}>
        <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 3, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ color: 'grey.200', fontWeight: 'bold' }}>
            אישור תקציב להזמנה
          </Typography>
          <Typography variant="h5" sx={{ mt: 1, color: 'warning.main', fontWeight: 'bold' }}>
            מספר הזמנה: {order?.orderNumber}
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <Stack spacing={4}>
            {/* Requester Info */}
            <Box>
              <Typography variant="h6" color="primary" gutterBottom>
                פרטי המזמין
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography>
                <strong>שם:</strong> {order?.requester?.fullName}
              </Typography>
              <Typography>
                <strong>יחידה:</strong> {order?.requester?.unit}
              </Typography>
              <Typography>
                <strong>אימייל:</strong> {order?.requester?.militaryEmail}
              </Typography>
            </Box>

            {/* Order Items */}
            <Box>
              <Typography variant="h6" color="primary" gutterBottom>
                פירוט הזמנה
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                {order?.itemEntries?.map(
                  (
                    item: {
                      id?: string;
                      product?: { name: string };
                      quantity: number;
                      computedTotalPrice: number;
                    },
                    idx: number
                  ) => (
                    <Paper
                      key={item.id || idx}
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        bgcolor: 'background.paper',
                        borderColor: 'grey.300',
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                        gap: 2,
                      }}
                    >
                      {/* Partie Droite (Infos Produit) */}
                      <Box>
                        <Typography variant="h5" color="primary.main" fontWeight="bold">
                          {item.product?.name}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                          מחיר ליחידה: ₪{Number(item.computedTotalPrice / item.quantity).toFixed(2)}
                        </Typography>
                      </Box>

                      {/* Partie Gauche (Chiffres et Total) */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {/* Bloc Quantité */}
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body1" color="text.secondary" display="block">
                            כמות
                          </Typography>
                          <Typography variant="h6" fontWeight="bold">
                            {item.quantity}
                          </Typography>
                        </Box>

                        <Divider
                          orientation="vertical"
                          flexItem
                          sx={{ display: { xs: 'none', sm: 'block' } }}
                        />

                        {/* Bloc Prix Total */}
                        <Box sx={{ textAlign: 'center', minWidth: '80px' }}>
                          <Typography variant="body1" color="text.secondary" display="block">
                            סה״כ
                          </Typography>
                          <Typography variant="h6" fontWeight="bold" color="primary.main">
                            ₪{Number(item.computedTotalPrice).toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  )
                )}
              </Stack>
            </Box>

            {/* Total */}
            <Box sx={{ bgcolor: 'primary.50', p: 3, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h5" color="primary.dark">
                סך הכל מוערך: <strong>₪{order?.totalPrice}</strong>
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Box>
              {!showRejectInput ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<CheckCircleOutlineIcon />}
                    onClick={() => actionMutation.mutate({ action: 'APPROVE' })}
                    disabled={actionMutation.isPending}
                    sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
                  >
                    אשר תקציב
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="large"
                    startIcon={<CancelOutlinedIcon />}
                    onClick={() => setShowRejectInput(true)}
                    disabled={actionMutation.isPending}
                    sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
                  >
                    דחה בקשה
                  </Button>
                </Stack>
              ) : (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" color="error" gutterBottom>
                    אנא ציין סיבת דחייה:
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    variant="outlined"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="למשל: חסר פירוט, חורג מהתקציב..."
                    sx={{ mb: 2 }}
                  />
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() =>
                        actionMutation.mutate({ action: 'REJECT', reason: rejectReason })
                      }
                      disabled={actionMutation.isPending || !rejectReason.trim()}
                    >
                      אשר דחייה
                    </Button>
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={() => {
                        setShowRejectInput(false);
                        setRejectReason('');
                      }}
                      disabled={actionMutation.isPending}
                    >
                      ביטול
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};
