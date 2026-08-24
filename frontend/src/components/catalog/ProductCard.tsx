import { Box, Card, CardContent, Chip, Divider, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import type { Product } from 'shared-types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();

  const basePrice = Number(product.basePrice);

  const handleProductClick = () => {
    navigate(`/product/${product.id}`);
  };

  return (
    <Card
      onClick={handleProductClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          handleProductClick();
        }
      }}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',

        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Product image */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4 / 3',
          bgcolor: 'grey.100',
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src={product.imageUrl}
          alt={product.name}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Category tag */}
        <Chip
          label={product.category}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            bgcolor: 'background.paper',
            color: 'primary.main',
            fontWeight: 400,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        />
      </Box>

      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          p: 2.5,
          '&:last-child': {
            pb: 2.5,
          },
        }}
      >
        {/* Name + description */}
        <Box>
          <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
            {product.name}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              lineHeight: 1.7,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.description}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Divider sx={{ my: 2 }} />

        {/* Bottom card section */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 2,
          }}
        >
          <Typography variant="body2">
            <Box component="span" sx={{ color: 'text.secondary' }}>
              החל מ-{' '}
            </Box>
            ₪{basePrice.toFixed(2)}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              cursor: 'pointer',
              color: 'primary.main',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'inherit',
              }}
            >
              התאמה והזמנה
            </Typography>

            <Typography
              component="span"
              aria-hidden="true"
              sx={{
                fontSize: '1.1rem',
                color: 'inherit',
              }}
            >
              ←
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
