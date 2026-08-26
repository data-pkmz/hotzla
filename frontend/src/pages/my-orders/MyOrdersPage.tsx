import { useQuery } from '@tanstack/react-query';

import { Alert, Box, CircularProgress, Container, Divider, Paper, Typography } from '@mui/material';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import type { OrderStatus } from 'shared-types';

import StatusBadge from '../../components/StatusBadge';
import { getMyOrders } from '../../services/api/orders.service';
import { useAuthStore } from '../../store/useAuthStore';
import { formatDate, formatPrice } from '../../utils/formatting';

interface MyOrder {
  id: string;
  orderNumber: string;
  createdAt: Date | string;
  totalPrice: number | string;
  status: OrderStatus;
}

export default function MyOrdersPage() {
  const navigate = useNavigate();

  const currentUser = useAuthStore((state) => state.currentUser);

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
  } = useQuery<MyOrder[]>({
    queryKey: ['my-orders', currentUser.adUsername],
    queryFn: getMyOrders,
  });

  const handleOrderClick = (orderId: string) => {
    navigate(`/orders/${orderId}`, {
      state: {
        from: '/my-orders',
        fromLabel: 'ההזמנות שלי',
      },
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
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            ההזמנות שלי
          </Typography>

          <Typography color="text.secondary">צפייה ומעקב אחר ההזמנות שלך.</Typography>
        </Box>

        {/* Loading */}
        {isLoading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 8,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* API error */}
        {isError && (
          <Alert severity="error">
            {error instanceof Error ? error.message : 'אירעה שגיאה בטעינת ההזמנות'}
          </Alert>
        )}

        {/* No orders */}
        {!isLoading && !isError && orders.length === 0 && (
          <Box
            sx={{
              py: 8,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" gutterBottom>
              עדיין אין הזמנות
            </Typography>

            <Typography color="text.secondary">
              ההזמנות שלך יופיעו כאן לאחר השלמת ההזמנה הראשונה.
            </Typography>
          </Box>
        )}

        {/* Orders list */}
        {!isLoading && !isError && orders.length > 0 && (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: 'none',
            }}
          >
            {/* Desktop column headings */}
            <Box
              sx={{
                display: {
                  xs: 'none',
                  md: 'grid',
                },
                gridTemplateColumns: '1.3fr 1fr 1fr 1.3fr 40px',
                alignItems: 'center',
                px: 3,
                py: 2,
                bgcolor: 'action.hover',
                direction: 'ltr',
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                מספר הזמנה
              </Typography>

              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                תאריך
              </Typography>

              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                סכום
              </Typography>

              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                סטטוס
              </Typography>

              <Box />
            </Box>

            {orders.map((order, index) => (
              <Box key={order.id}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => handleOrderClick(order.id)}
                  sx={{
                    width: '100%',
                    border: 0,
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    textAlign: 'inherit',
                    px: 3,
                    py: 2.5,
                    direction: 'ltr',
                    display: 'grid',

                    gridTemplateColumns: {
                      xs: '1fr auto',
                      md: '1.3fr 1fr 1fr 1.3fr 40px',
                    },

                    gridTemplateAreas: {
                      xs: `
                        "order arrow"
                        "details arrow"
                      `,
                      md: '"order date price status arrow"',
                    },

                    alignItems: 'center',

                    gap: {
                      xs: 1.5,
                      md: 2,
                    },

                    transition: 'background-color 0.15s ease',

                    '&:hover': {
                      bgcolor: 'action.hover',
                    },

                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: '-2px',
                    },
                  }}
                >
                  {/* Order number */}
                  <Box sx={{ gridArea: 'order' }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: {
                          xs: 'block',
                          md: 'none',
                        },
                      }}
                    >
                      מספר הזמנה
                    </Typography>

                    <Typography fontWeight={700}>{order.orderNumber}</Typography>
                  </Box>

                  {/* Date */}
                  <Box
                    sx={{
                      gridArea: {
                        xs: 'details',
                        md: 'date',
                      },

                      display: {
                        xs: 'flex',
                        md: 'block',
                      },

                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: {
                            xs: 'block',
                            md: 'none',
                          },
                        }}
                      >
                        תאריך
                      </Typography>

                      <Typography variant="body2">{formatDate(order.createdAt)}</Typography>
                    </Box>

                    {/* Mobile price */}
                    <Box
                      sx={{
                        display: {
                          xs: 'block',
                          md: 'none',
                        },
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        סכום
                      </Typography>

                      <Typography variant="body2" fontWeight={600}>
                        {formatPrice(order.totalPrice)}
                      </Typography>
                    </Box>

                    {/* Mobile status */}
                    <Box
                      sx={{
                        display: {
                          xs: 'block',
                          md: 'none',
                        },
                      }}
                    >
                      <StatusBadge status={order.status} />
                    </Box>
                  </Box>

                  {/* Desktop price */}
                  <Typography
                    sx={{
                      gridArea: 'price',

                      display: {
                        xs: 'none',
                        md: 'block',
                      },

                      fontWeight: 600,
                    }}
                  >
                    {formatPrice(order.totalPrice)}
                  </Typography>

                  {/* Desktop status */}
                  <Box
                    sx={{
                      gridArea: 'status',

                      display: {
                        xs: 'none',
                        md: 'block',
                      },
                    }}
                  >
                    <StatusBadge status={order.status} />
                  </Box>

                  {/* Arrow */}
                  <ArrowBackIcon
                    sx={{
                      gridArea: 'arrow',
                      color: 'primary.main',
                      justifySelf: 'end',
                    }}
                  />
                </Box>

                {index !== orders.length - 1 && <Divider />}
              </Box>
            ))}
          </Paper>
        )}
      </Container>
    </Box>
  );
}
