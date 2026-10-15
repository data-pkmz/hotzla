import React, { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Breadcrumbs,
  CircularProgress,
  Snackbar,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';

import type { SelectedAttributeInput } from 'shared-types';

import AttributeForm from '../../components/DynamicAttributeInput/AttributeForm';
import PriceBreakdown from '../../components/PriceBreakdown/PriceBreakdown';

import useProductDetails from '../../hooks/useProductDetails';
import usePriceCalculator from '../../hooks/usePriceCalculator';

import { addItemToCart } from '../../services/api/cart.service';
import { uploadFile } from '../../services/api/file.service';

interface ProductConfiguration {
  quantity: number;
  selectedAttributes: SelectedAttributeInput[];
}

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { product, isLoading: productIsLoading, error: productError } = useProductDetails(id);

  const [configuration, setConfiguration] = useState<ProductConfiguration>({
    quantity: 1,
    selectedAttributes: [],
  });

  const [formIsValid, setFormIsValid] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [wasAddedToCart, setWasAddedToCart] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const [addToCartError, setAddToCartError] = useState<string | null>(null);

  // Prevent repeated submissions before React has committed state updates.
  const addToCartInProgress = useRef(false);

  const {
    priceResult,
    isLoading: priceIsLoading,
    error: priceError,
  } = usePriceCalculator({
    productId: id,
    quantity: configuration.quantity,
    minQuantity: product?.minQuantity,
    maxQuantity: product?.maxQuantity,
    selectedAttributes: configuration.selectedAttributes,
    enabled: Boolean(product),
  });

  const handleAddToCart = async () => {
    if (
      !product ||
      !formIsValid ||
      !priceResult ||
      priceIsLoading ||
      priceError ||
      addToCartInProgress.current ||
      wasAddedToCart
    ) {
      return;
    }

    addToCartInProgress.current = true;
    setIsAddingToCart(true);
    setAddToCartError(null);

    try {
      let uploadedFilePath: string | undefined;

      if (selectedFile) {
        uploadedFilePath = await uploadFile(selectedFile);
      }

      await addItemToCart({
        productId: product.id,
        quantity: configuration.quantity,
        selectedAttributes: configuration.selectedAttributes,
        uploadedFilePath,
      });

      setWasAddedToCart(true);
      setShowSuccessMessage(true);

      // Update cart summaries without treating a cache-refresh failure
      // as a failed addition.
      void queryClient.invalidateQueries({
        queryKey: ['activeCart'],
      });
    } catch {
      setAddToCartError('לא ניתן להוסיף את המוצר לסל כרגע. אנא נסה שוב.');
    } finally {
      addToCartInProgress.current = false;
      setIsAddingToCart(false);
    }
  };

  const configurationSnapshot = useRef('');

  const handleConfigurationChange = (value: ProductConfiguration, isValid: boolean) => {
    const snapshot = JSON.stringify(value);

    if (configurationSnapshot.current !== snapshot) {
      configurationSnapshot.current = snapshot;
      setConfiguration(value);
      setWasAddedToCart(false);
      setAddToCartError(null);
    }

    setFormIsValid(isValid);
  };

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
            error={addToCartError ?? priceError}
            isFormValid={formIsValid}
            onAddToCart={handleAddToCart}
            isAddingToCart={isAddingToCart}
            wasAddedToCart={wasAddedToCart}
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
            minQuantity={product.minQuantity}
            maxQuantity={product.maxQuantity}
            onChange={handleConfigurationChange}
            onFileChange={(file) => {
              setSelectedFile(file);
              setWasAddedToCart(false);
              setAddToCartError(null);
            }}
          />
        </Box>
      </Box>

      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={6000}
        onClose={(_event, reason) => {
          if (reason !== 'clickaway') {
            setShowSuccessMessage(false);
          }
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setShowSuccessMessage(false)}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/cart')}>
              מעבר לסל
            </Button>
          }
          sx={{ width: '100%', direction: 'rtl' }}
        >
          המוצר נוסף לסל בהצלחה!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductDetailPage;
