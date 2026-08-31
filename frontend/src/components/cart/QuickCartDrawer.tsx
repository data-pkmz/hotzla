import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { CartItem } from 'shared-types';
import QuantityControl from './QuantityControl';
import { getActiveCart, updateCartItem, removeCartItem } from '../../services/api/cart.service';

interface QuickCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickCartDrawer({ isOpen, onClose }: QuickCartDrawerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

  // 1. Fetch Cart Data
  const { data: cart, isLoading } = useQuery({
    queryKey: ['activeCart'],
    queryFn: getActiveCart,
    // Only fetch if the drawer is open to save background requests,
    // OR keep it enabled always so the badge in the header can use the cached data!
    enabled: isOpen,
  });

  const items: CartItem[] = cart?.items || cart?.cartItemEntries || [];
  const totalPrice = items.reduce((sum, item) => sum + Number(item.computedPrice), 0);

  // 2. Mutations
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, newQuantity }: { id: string; newQuantity: number }) => {
      return updateCartItem(id, { quantity: newQuantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeCart'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: removeCartItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeCart'] });
    },
  });

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    updateQuantityMutation.mutate({ id, newQuantity });
  };

  const handleRemove = (id: string) => {
    removeItemMutation.mutate(id);
  };

  const handleGoToCart = () => {
    onClose();
    navigate('/cart');
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={onClose}
        sx={{ zIndex: 1300 }}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 } },
        }}
      >
        <Box dir="rtl" sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
          {/* Header */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingCartIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                סל קניות מהיר
              </Typography>
            </Box>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Item List */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                <CircularProgress />
              </Box>
            ) : items.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 5 }}>
                העגלה שלך ריקה
              </Typography>
            ) : (
              items.map((item) => (
                <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                  <Box
                    component="img"
                    src={item.product?.imageUrl || 'https://via.placeholder.com/50'}
                    alt={item.product?.name}
                    sx={{ width: 50, height: 50, borderRadius: 1, objectFit: 'cover' }}
                  />

                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                      {item.product?.name || 'מוצר לא ידוע'}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mt: 1,
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      <QuantityControl
                        size="small"
                        quantity={Number(item.quantity)}
                        minQuantity={item.product?.minQuantity ?? 1}
                        maxQuantity={item.product?.maxQuantity ?? null}
                        onUpdate={(newQuantity) => handleUpdateQuantity(item.id, newQuantity)}
                      />

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 'bold', color: 'primary.main' }}
                        >
                          ₪{Number(item.computedPrice).toFixed(2)}
                        </Typography>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setItemToDeleteId(item.id)}
                          sx={{
                            bgcolor: 'error.lighter',
                            '&:hover': { bgcolor: 'error.light', color: 'white' },
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))
            )}
          </Box>

          {/* Footer */}
          {items.length > 0 && (
            <Box sx={{ mt: 'auto', pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">סך הכל:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  ₪{totalPrice.toFixed(2)}
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                onClick={handleGoToCart}
              >
                מעבר לעגלה המלאה
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>

      <Dialog
        open={Boolean(itemToDeleteId)}
        onClose={() => setItemToDeleteId(null)}
        dir="rtl"
        disableScrollLock={true}
      >
        <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'start' }}>מחיקת פריט</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ textAlign: 'start' }}>
            האם אתה בטוח שברצונך למחוק את הפריט מהעגלה?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setItemToDeleteId(null)} color="inherit">
            ביטול
          </Button>
          <Button
            onClick={() => {
              if (itemToDeleteId) handleRemove(itemToDeleteId);
              setItemToDeleteId(null);
            }}
            color="error"
            variant="contained"
          >
            מחק
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
