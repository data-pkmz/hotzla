import { Box, Button, CircularProgress, Divider, Typography } from '@mui/material';

import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';

import type { PriceResult } from 'shared-types';

interface PriceBreakdownProps {
  result: PriceResult | null;
  isLoading?: boolean;
  error?: string | null;
  isFormValid?: boolean;
}

interface PriceRowProps {
  label: string;
  selectedValue?: string;
  price: number;
}

const formatPrice = (price: number): string => `₪${price.toFixed(2)}`;

function PriceRow({ label, selectedValue, price }: PriceRowProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 2,
        py: 1.25,
      }}
    >
      <Box
        sx={{
          minWidth: 0,
          textAlign: 'right',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255,255,255,0.92)',
            fontWeight: 500,
          }}
        >
          {label}
        </Typography>

        {selectedValue ? (
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.6)',
              display: 'block',
              mt: 0.25,
              textAlign: 'left',
            }}
          >
            {selectedValue}
          </Typography>
        ) : null}
      </Box>

      <Typography
        variant="body2"
        sx={{
          color: 'common.white',
          fontWeight: 600,
          flexShrink: 0,
          direction: 'ltr',
        }}
      >
        {formatPrice(price)}
      </Typography>
    </Box>
  );
}

export default function PriceBreakdown({
  result,
  isLoading = false,
  error,
  isFormValid = false,
}: PriceBreakdownProps) {
  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: '#25244A',
        color: 'common.white',
        borderRadius: 3,
        p: 3,
        direction: 'ltr',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: 2,
          textAlign: 'left',
          color: 'common.white',
        }}
      >
        סיכום הזמנה
      </Typography>

      <Divider
        sx={{
          my: 2,
          borderColor: 'rgba(255,255,255,0.2)',
        }}
      />

      {isLoading && !result ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 4,
          }}
        >
          <CircularProgress
            size={26}
            sx={{
              color: 'common.white',
            }}
          />
        </Box>
      ) : null}

      {error ? (
        <Typography
          variant="body2"
          sx={{
            color: '#ffb4b4',
            mb: 2,
          }}
        >
          {error}
        </Typography>
      ) : null}

      {result ? (
        <>
          <PriceRow label={`מחיר בסיס (x${result.quantity})`} price={result.baseTotal} />

          {result.breakdown.map((line) => {
            const shouldShowSelectedValue =
              line.selectedValue !== 'true' && line.selectedValue !== 'false';

            return (
              <PriceRow
                key={line.attributeDefinitionId}
                label={line.attributeName}
                selectedValue={shouldShowSelectedValue ? line.selectedValue : undefined}
                price={line.contribution}
              />
            );
          })}

          <Divider
            sx={{
              my: 2,
              borderColor: 'rgba(255,255,255,0.2)',
            }}
          />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontWeight: 700,
                color: 'common.white',
              }}
            >
              סה״כ לתשלום
            </Typography>

            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                direction: 'ltr',
                color: 'common.white',
              }}
            >
              {formatPrice(result.totalPrice)}
            </Typography>
          </Box>
          {!isFormValid && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  textAlign: 'left',
                }}
              >
                יש להשלים את כל שדות החובה לפני המשך להזמנה
              </Typography>
            </Box>
          )}

          <Button
            fullWidth
            variant="contained"
            endIcon={<ShoppingCartOutlinedIcon />}
            disabled={!isFormValid || !result || isLoading}
            onClick={() => {
              // Cart functionality will be connected later.
            }}
            sx={{
              minHeight: 48,
              borderRadius: 2,
              bgcolor: '#3a36ab',
              color: 'common.white',
              fontWeight: 700,

              '&:hover': {
                bgcolor: 'grey.100',
              },
            }}
          >
            המשך לסל
          </Button>
        </>
      ) : (
        !isLoading && (
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.65)',
              textAlign: 'left',
            }}
          >
            {isFormValid
              ? 'בחרו את אפשרויות המוצר לקבלת מחיר'
              : 'יש לתקן או להשלים את פרטי המוצר לקבלת מחיר'}
          </Typography>
        )
      )}
    </Box>
  );
}
