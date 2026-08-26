import React, { useState, useMemo } from 'react';
import { Box, Container, Grid, Typography, Alert, Button } from '@mui/material';
import type { CartItem } from 'shared-types';

import CartItemRow from '../../components/cart/CartItemRow';
import CartSummaryCard from '../../components/cart/CartSummaryCard';
import QuickCartDrawer from '../../components/cart/QuickCartDrawer';

// ----------------------------------------------------------------------
// MOCK DATA: To be replaced by React Query when Backend is ready (DPS-025)
// ----------------------------------------------------------------------
const initialMockItems: CartItem[] = [
  {
    id: 'item-1',
    cartId: 'cart-123',
    productId: 'prod-1',
    quantity: 2,
    computedPrice: 100, // 50 * 2
    selectedAttributes: { צבע: 'אדום', 'סוג נייר': 'כרומו' },
    product: {
      id: 'prod-1',
      name: 'פוסטר גיוס',
      description: 'פוסטר גדול לגיוס לוחמים',
      category: 'פוסטרים',
      imageUrl: 'https://via.placeholder.com/80',
      isActive: true,
      productType: 'DYNAMIC',
      basePrice: 50,
      createdBy: null,
      createdAt: new Date(),
    },
  },
  {
    id: 'item-2',
    cartId: 'cart-123',
    productId: 'prod-2',
    quantity: 1,
    computedPrice: 350.5,
    selectedAttributes: { מידה: 'A3', גימור: 'מט' },
    product: {
      id: 'prod-2',
      name: 'חוברת נהלים',
      description: 'חוברת נהלי חירום',
      category: 'חוברות',
      imageUrl: 'https://via.placeholder.com/80',
      isActive: true,
      productType: 'FIXED',
      basePrice: 350.5,
      createdBy: null,
      createdAt: new Date(),
    },
  },
];
// ----------------------------------------------------------------------

export default function CartPage() {
  // We put the mock data in the state so we can edit it interactively!
  const [items, setItems] = useState<CartItem[]>(initialMockItems);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Auto-calculate the total price whenever the items array changes
  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + item.computedPrice, 0);
  }, [items]);

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id === id) {
          // Calculate the fake unit price to update the total correctly
          const unitPrice = item.computedPrice / item.quantity;
          return {
            ...item,
            quantity: newQuantity,
            computedPrice: unitPrice * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const handleRemove = (id: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    // For now, just a visual feedback. Later it will call the Backend.
    alert('מועבר לקופה... (Simulated Checkout)');
  };

  return (
    <Box
      sx={{
        minHeight: '100%',
        bgcolor: 'background.default',
        direction: 'rtl',
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="xl">
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4 }}>
          עגלת הקניות שלי
        </Typography>

        {items.length === 0 ? (
          <Alert severity="info" sx={{ fontSize: '1.1rem' }}>
            העגלה שלך ריקה. חזור לקטלוג כדי להוסיף מוצרים!
          </Alert>
        ) : (
          <Grid container spacing={4}>
            {/* Left side (RTL) / Main side: The list of items */}
            <Grid item xs={12} md={8}>
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemove}
                />
              ))}
            </Grid>

            {/* Right side (RTL) / Sidebar: The Summary Card */}
            <Grid item xs={12} md={4}>
              <CartSummaryCard totalPrice={totalPrice} onCheckout={handleCheckout} />

              {/* BOUTON TEMPORAIRE POUR TESTER LE TIROIR */}
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  (Bouton temporaire pour tester le ticket)
                </Typography>
                <Button variant="outlined" onClick={() => setIsDrawerOpen(true)}>
                  Ouvrir le QuickCartDrawer
                </Button>
              </Box>
            </Grid>
          </Grid>
        )}
      </Container>

      {/* LE TIROIR CACHÉ */}
      <QuickCartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} items={items} />
    </Box>
  );
}
