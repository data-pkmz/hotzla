import { useMemo } from 'react';
import { Box, Container, Grid, Typography, Alert, CircularProgress } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import CartItemRow from '../../components/cart/CartItemRow';
import CartSummaryCard from '../../components/cart/CartSummaryCard';

import { getActiveCart, updateCartItem, removeCartItem } from '../../services/api/cart.service';
import type { CartItem } from 'shared-types';

export default function CartPage() {
  const queryClient = useQueryClient();

  // 1. Fetch the real cart from the Backend (port 8080)
  const {
    data: cart,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['activeCart'],
    queryFn: getActiveCart,
  });

  // Handle difference between Prisma schema (cartItemEntries) and shared-types (items)
  const items: CartItem[] = useMemo(() => cart?.items || cart?.cartItemEntries || [], [cart]);

  // Auto-calculate the total price using real backend prices
  const totalPrice = useMemo(() => {
    return items.reduce((sum: number, item: CartItem) => sum + Number(item.computedPrice), 0);
  }, [items]);

  // 2. Mutation to update quantity
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, newQuantity }: { id: string; newQuantity: number }) => {
      // The backend expects selectedAttributes even for quantity updates
      // The frontend mock used { [key]: value }, but shared-types uses SelectedAttributeInput[].
      // For now we pass empty array or properly mapped array if needed.
      return updateCartItem(id, { quantity: newQuantity });
    },
    onSuccess: () => {
      // Tell React Query to refetch the cart so the prices update automatically!
      queryClient.invalidateQueries({ queryKey: ['activeCart'] });
    },
  });

  // 3. Mutation to remove item
  const removeItemMutation = useMutation({
    mutationFn: removeCartItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeCart'] });
    },
  });

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    // Find the item to pass its current attributes (even if mocked empty for now)
    const itemToUpdate = items.find((i) => i.id === id);
    if (itemToUpdate) {
      updateQuantityMutation.mutate({ id, newQuantity });
    }
  };

  const handleRemove = (id: string) => {
    removeItemMutation.mutate(id);
  };

  const handleCheckout = () => {
    // Navigate to the checkout page (which will use checkoutCart)
    alert('מוכן להזמנה! (נתיב הקופה ייווצר בהמשך)');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ mt: 10 }}>
        <Container>
          <Alert severity="error">שגיאת התחברות לשרת. נא לוודא שה-Docker פועל!</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      dir="rtl"
      sx={{
        minHeight: '100%',
        bgcolor: 'background.default',
        direction: 'rtl',
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="xl">
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4, textAlign: 'left' }}>
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
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}
