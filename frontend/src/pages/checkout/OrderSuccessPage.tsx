import { Alert, Box, Button, Card, Container, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

interface SuccessLocationState {
  orderNumber?: string;
}

// Confirmation screen shown after a successful checkout submission.
export function OrderSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as SuccessLocationState | null) ?? {};
  const orderNumber = state.orderNumber || 'לא זמין';

  return (
    <Container maxWidth="md" sx={{ py: 6 }} dir="rtl">
      <Card
        sx={{
          p: { xs: 3, md: 5 },
          textAlign: 'center',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'success.main',
          boxShadow: 3,
        }}
      >
        <Alert severity="success" sx={{ mb: 3, textAlign: 'right' }}>
          ההזמנה נשלחה בהצלחה!
        </Alert>

        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
          מספר הזמנה: {orderNumber}
        </Typography>

        <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
          תודה על ההזמנה. קצין התקציב יקבל את הבקשה לאישור, ואנו נמשיך בתהליך המיילים עם פרטי ההמשך.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" color="primary" onClick={() => navigate('/my-orders')}>
            לעמוד ההזמנות שלי
          </Button>
          <Button variant="outlined" onClick={() => navigate('/')}>
            חזרה לקטלוג
          </Button>
        </Box>
      </Card>
    </Container>
  );
}

export default OrderSuccessPage;
