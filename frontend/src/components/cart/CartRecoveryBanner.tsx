import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { getActiveCart, removeCartItem } from '../../services/api/cart.service';
import { useCartStore } from '../../store/useCartStore';
import type { CartItem } from 'shared-types';

export default function CartRecoveryBanner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isRecoveryBannerDismissed, dismissRecoveryBanner } = useCartStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch the active cart to see if it has items
  const { data: cart, isLoading } = useQuery({
    queryKey: ['activeCart'],
    queryFn: getActiveCart,
  });

  const items = cart?.items || cart?.cartItemEntries || [];

  // Mutation to clear the cart
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(items.map((item: CartItem) => removeCartItem(item.id)));
    },
    onSuccess: () => {
      dismissRecoveryBanner(); // Dismiss it so it doesn't blink if cache updates slowly
      queryClient.invalidateQueries({ queryKey: ['activeCart'] });
    },
  });

  const handleContinue = () => {
    dismissRecoveryBanner();
    navigate('/cart');
  };

  // If loading, empty, or dismissed, don't show the banner
  if (isLoading || items.length === 0 || isRecoveryBannerDismissed) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      dir="rtl"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: '#E3EDF9', // light blue from the design
        borderRadius: 2,
        p: { xs: 2, md: 3 },
        mb: 4,
        gap: 3,
      }}
    >
      {/* Right side (RTL): Text and Icon */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: 'rgba(0, 0, 0, 0.05)',
          }}
        >
          <ShoppingCartCheckoutIcon sx={{ fontSize: 24, color: '#1A202C' }} />
        </Box>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 'bold', color: '#1A202C', mb: 0.5, textAlign: 'start' }}
          >
            נראה שיש לך עגלה פתוחה מביקור קודם
          </Typography>
          <Typography variant="body2" sx={{ color: '#4A5568', textAlign: 'start' }}>
            המשך את ההזמנה שלך כדי לא לאבד את הפריטים.
          </Typography>
        </Box>
      </Box>

      {/* Left side (RTL): Buttons */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', md: 'auto' } }}
      >
        <Button
          variant="text"
          color="inherit"
          onClick={() => setIsDialogOpen(true)}
          disabled={clearCartMutation.isPending}
          sx={{ fontWeight: 'bold', color: '#4A5568' }}
        >
          נקה עגלה
        </Button>
        <Button
          variant="contained"
          onClick={handleContinue}
          sx={{
            bgcolor: '#0B1120', // dark navy from the design
            color: 'white',
            fontWeight: 'bold',
            px: 4,
            py: 1,
            borderRadius: 1.5,
            '&:hover': {
              bgcolor: '#1a2642',
            },
          }}
        >
          המשך להזמנה
        </Button>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        dir="rtl"
        disableScrollLock={true}
      >
        <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'start' }}>מחיקת עגלה</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ textAlign: 'start' }}>
            האם אתה בטוח שברצונך למחוק את כל הפריטים בעגלה? פעולה זו בלתי הפיכה.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIsDialogOpen(false)} color="inherit">
            ביטול
          </Button>
          <Button
            onClick={() => {
              setIsDialogOpen(false);
              clearCartMutation.mutate();
            }}
            color="error"
            variant="contained"
          >
            רוקן עגלה
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
