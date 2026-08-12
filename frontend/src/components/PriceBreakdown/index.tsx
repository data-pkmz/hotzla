import React from 'react';
import { Paper, Typography, Box, Button } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';

export const CatalogPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <StorefrontIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            קטלוג מוצרים
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" paragraph>
          ברוכים הבאים לקטלוג המוצרים של בית הדפוס. כאן יוצגו מוצרי הדפוס הזמינים להזמנה.
        </Typography>
        <Button variant="contained" color="primary" size="large">
          התחל בהזמנה
        </Button>
      </Paper>
    </Box>
  );
};

export default CatalogPage;
