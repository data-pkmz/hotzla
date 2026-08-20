import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Box, Breadcrumbs, CircularProgress, Typography } from '@mui/material';

import type { SelectedAttributeInput } from 'shared-types';

import AttributeForm from '../../components/DynamicAttributeInput/AttributeForm';
import PriceBreakdown from '../../components/PriceBreakdown/PriceBreakdown';

import useProductDetails from '../../hooks/useProductDetails';
import usePriceCalculator from '../../hooks/usePriceCalculator';

interface ProductConfiguration {
  quantity: number;
  selectedAttributes: SelectedAttributeInput[];
}

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { product, isLoading: productIsLoading, error: productError } = useProductDetails(id);

  const [configuration, setConfiguration] = useState<ProductConfiguration>({
    quantity: 1,
    selectedAttributes: [],
  });

  const [formIsValid, setFormIsValid] = useState(false);

  const {
    priceResult,
    isLoading: priceIsLoading,
    error: priceError,
  } = usePriceCalculator({
    productId: id,
    quantity: configuration.quantity,
    selectedAttributes: configuration.selectedAttributes,
    enabled: Boolean(product),
  });

  if (productIsLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          py: 8,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (productError) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{productError}</Typography>
      </Box>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1400,
        mx: 'auto',
        px: {
          xs: 2,
          md: 4,
        },
        py: 3,
      }}
    >
      <Breadcrumbs
        separator="›"
        sx={{
          mb: 3,
          direction: 'ltr',
        }}
      >
        <Link
          to="/"
          style={{
            color: 'inherit',
            textDecoration: 'underline',
          }}
        >
          קטלוג
        </Link>

        <Link
          to={`/?category=${encodeURIComponent(product.category)}`}
          style={{
            color: 'inherit',
            textDecoration: 'underline',
          }}
        >
          {product.category}
        </Link>

        <Typography color="#3a36ab">{product.name}</Typography>
      </Breadcrumbs>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: '320px minmax(0, 1fr)',
          },
          gap: 4,
          alignItems: 'start',
        }}
      >
        <Box
          sx={{
            position: {
              lg: 'sticky',
            },
            top: {
              lg: 24,
            },
          }}
        >
          <PriceBreakdown
            result={priceResult}
            isLoading={priceIsLoading}
            error={priceError}
            isFormValid={formIsValid}
          />
        </Box>
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
            p: {
              xs: 2,
              md: 4,
            },
          }}
        >
          <Typography
            variant="h4"
            sx={{
              mb: 3,
              fontWeight: 700,
              direction: 'rtl',
              textAlign: 'left',
            }}
          >
            {product.name}
          </Typography>

          <AttributeForm
            attributeDefinitions={product.attributes}
            onChange={(value, isValid) => {
              setConfiguration(value);
              setFormIsValid(isValid);
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default ProductDetailPage;
