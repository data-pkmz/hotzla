import { Card, Typography, Button, Divider, Box } from '@mui/material';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';

interface CartSummaryCardProps {
  totalPrice: number;
  onCheckout: () => void;
  disabled?: boolean;
}

export default function CartSummaryCard({
  totalPrice,
  onCheckout,
  disabled = false,
}: CartSummaryCardProps) {
  return (
    <Card
      dir="rtl"
      variant="outlined"
      sx={{
        p: 3,
        borderRadius: 2,
        position: 'sticky',
        top: 24, // Sticks to the top when scrolling down the page
        bgcolor: 'surfaceBright',
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'start' }}>
        סיכום הזמנה {/* "Order Summary" */}
      </Typography>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="body1">סה״כ ביניים</Typography>
        <Typography variant="body1">₪{Number(totalPrice).toFixed(2)}</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          דמי משלוח / טיפול
        </Typography>
        <Typography variant="body2" color="text.secondary">
          חינם
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          סה״כ לתשלום
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          ₪{Number(totalPrice).toFixed(2)}
        </Typography>
      </Box>

      <Button
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        onClick={onCheckout}
        disabled={disabled || totalPrice <= 0}
        startIcon={<ShoppingCartCheckoutIcon />}
        sx={{
          py: 1.5,
          fontSize: '1.1rem',
          fontWeight: 'bold',
          borderRadius: 2,
        }}
      >
        המשך לתשלום / אישור {/* "Continue to checkout / approval" */}
      </Button>
    </Card>
  );
}
