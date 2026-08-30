import { Box, Card, Typography, IconButton, Divider } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import type { CartItem } from 'shared-types';
import QuantityControl from './QuantityControl';

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

  return (
    <Card
      dir="rtl"
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
        <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'start' }}>
          {productName}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'start' }}>
          {attributesText || 'ללא תכונות מיוחדות'}
        </Typography>
      </Box>

      {/* 3. Quantity Controls */}
      <QuantityControl
        quantity={Number(item.quantity)}
        onUpdate={(newQuantity) => onUpdateQuantity(item.id, newQuantity)}
      />

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
          ₪{Number(item.computedPrice).toFixed(2)}
        </Typography>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

        <IconButton
          color="error"
          onClick={() => onRemove(item.id)}
          sx={{
            bgcolor: 'error.lighter',
            '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
          }}
        >
          <DeleteOutlineIcon />
        </IconButton>
      </Box>
    </Card>
  );
}
