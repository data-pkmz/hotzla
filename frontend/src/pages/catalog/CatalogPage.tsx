import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import {
  Alert,
  Box,
  Container,
  Grid,
  InputAdornment,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';

import CategoryFilter from '../../components/DynamicAttributeInput/CategoryFilter';
import ProductCard from '../../components/catalog/ProductCard';
import { getProducts } from '../../services/api/catalog.service';

export default function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get('category');

  const {
    data: products = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['catalog-products'],
    queryFn: getProducts,
  });

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.category))).sort((a, b) =>
      a.localeCompare(b, 'he')
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = selectedCategory === null || product.category === selectedCategory;

      const matchesSearch =
        normalizedSearch === '' ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.description.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleCategoryChange = (category: string | null) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      if (category) {
        next.set('category', category);
      } else {
        next.delete('category');
      }

      return next;
    });
  };

  return (
    <Box
      sx={{
        minHeight: '100%',
        bgcolor: 'background.paper',
        direction: 'ltr',
        py: {
          xs: 3,
          md: 5,
        },
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 4,
            mb: 3,
            flexDirection: {
              xs: 'column',
              md: 'row',
            },
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
              קטלוג המוצרים
            </Typography>

            <Typography color="text.secondary">
              בחרו את המוצר המתאים לכם והמשיכו להתאמה ולהזמנה.
            </Typography>
          </Box>

          <TextField
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="חפש מוצר..."
            inputProps={{
              'aria-label': 'חיפוש מוצרים',
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{
              width: {
                xs: '100%',
                md: 360,
              },
              '& .MuiOutlinedInput-root': {
                height: 44,
              },
            }}
          />
        </Box>

        {/* Categories */}
        {!isLoading && !isError && products.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </Box>
        )}

        {/* Loading */}
        {isLoading && (
          <Grid container spacing={3}>
            {Array.from({ length: 8 }).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    sx={{
                      aspectRatio: '4 / 3',
                      height: 'auto',
                    }}
                  />

                  <Box sx={{ p: 2.5 }}>
                    <Skeleton variant="text" width="60%" height={32} />

                    <Skeleton variant="text" width="100%" />

                    <Skeleton variant="text" width="80%" />

                    <Skeleton variant="text" width="40%" sx={{ mt: 2 }} />
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {/* API error */}
        {isError && (
          <Alert severity="error">
            {error instanceof Error ? error.message : 'אירעה שגיאה בטעינת הקטלוג'}
          </Alert>
        )}

        {/* Entire catalog empty */}
        {!isLoading && !isError && products.length === 0 && (
          <Box
            sx={{
              py: 8,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" gutterBottom>
              אין מוצרים זמינים כרגע
            </Typography>

            <Typography color="text.secondary">
              מוצרים חדשים יופיעו כאן כאשר יהיו זמינים להזמנה.
            </Typography>
          </Box>
        )}

        {/* Search/filter produced zero results */}
        {!isLoading && !isError && products.length > 0 && filteredProducts.length === 0 && (
          <Box
            sx={{
              py: 8,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" gutterBottom>
              לא נמצאו מוצרים
            </Typography>

            <Typography color="text.secondary">
              נסו לשנות את החיפוש או לבחור קטגוריה אחרת.
            </Typography>
          </Box>
        )}

        {/* Product grid */}
        {!isLoading && !isError && filteredProducts.length > 0 && (
          <Grid container spacing={3}>
            {filteredProducts.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <ProductCard product={product} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
