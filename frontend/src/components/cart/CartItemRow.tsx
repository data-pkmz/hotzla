import React from 'react';
import { Box, Card, Typography, IconButton, Divider } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

import type { CartItem } from 'shared-types';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  onRemove: (id: string) => void;
}

export default function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  // Safe defaults in case product data is missing
  const productName = item.product?.name || 'מוצר לא ידוע';
  const productImage = item.product?.imageUrl || 'https://via.placeholder.com/80';

  // Format the selected attributes into a readable string
  const attributesText = Object.entries(item.selectedAttributes || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ');

  const handleDecrease = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleIncrease = () => {
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        mb: 2,
        gap: 2,
        borderRadius: 2,
        flexDirection: { xs: 'column', sm: 'row' },
      }}
    >
      {/* 1. Image */}
      <Box
        component="img"
        src={productImage}
        alt={productName}
        sx={{
          width: 80,
          height: 80,
          objectFit: 'cover',
          borderRadius: 1,
        }}
      />

      {/* 2. Product Info */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {productName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {attributesText || 'ללא מאפיינים מיוחדים'}
        </Typography>
      </Box>

      {/* 3. Quantity Controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 0.5,
        }}
      >
        <IconButton size="small" onClick={handleIncrease}>
          <AddIcon fontSize="small" />
        </IconButton>

        <Typography sx={{ mx: 2, minWidth: 20, textAlign: 'center' }}>{item.quantity}</Typography>

        <IconButton size="small" onClick={handleDecrease} disabled={item.quantity <= 1}>
          <RemoveIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* 4. Price & Remove */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minWidth: 120,
          justifyContent: 'flex-end',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          ₪{item.computedPrice.toFixed(2)}
        </Typography>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

        <IconButton color="error" onClick={() => onRemove(item.id)}>
          <DeleteOutlineIcon />
        </IconButton>
      </Box>
    </Card>
  );
}
