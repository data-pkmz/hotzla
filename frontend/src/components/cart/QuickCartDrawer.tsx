import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, Box, Typography, IconButton, Divider, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import type { CartItem } from 'shared-types';

interface QuickCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
}

export default function QuickCartDrawer({ isOpen, onClose, items }: QuickCartDrawerProps) {
  const navigate = useNavigate();

  // Calculate total price
  const totalPrice = items.reduce((sum, item) => sum + item.computedPrice, 0);

  const handleGoToCart = () => {
    onClose(); // Close the drawer first
    navigate('/cart'); // Then navigate to the full cart page
  };

  return (
    <Drawer
      anchor="right" // Will open from the right side
      open={isOpen}
      onClose={onClose}
      sx={{ zIndex: 1300 }} // MUI Default AppBar is 1100, Modal is 1300. This forces it above the header.
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 }, p: 2 },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
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
        {items.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 5 }}>
            העגלה שלך ריקה
          </Typography>
        ) : (
          items.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
              <Box
                component="img"
                src={item.product?.imageUrl || 'https://via.placeholder.com/50'}
                alt={item.product?.name}
                sx={{ width: 50, height: 50, borderRadius: 1, objectFit: 'cover' }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {item.product?.name || 'מוצר לא ידוע'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  כמות: {item.quantity}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                ₪{item.computedPrice.toFixed(2)}
              </Typography>
            </Box>
          ))
        )}
      </Box>

      {/* Footer */}
      {items.length > 0 && (
        <Box sx={{ mt: 'auto', pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">סה״כ:</Typography>
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
    </Drawer>
  );
}
