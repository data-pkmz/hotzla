import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Alert, Box, CircularProgress, Container, Divider, Paper, Typography } from '@mui/material';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import type { OrderListResponse } from 'shared-types';

import StatusBadge from '../../../components/StatusBadge';
import { getOrders } from '../../../services/api/orders.service';
import { useAuthStore } from '../../../store/useAuthStore';
import { formatDate, formatPrice } from '../../../utils/formatting';

export default function OrdersTable() {
  const navigate = useNavigate();

  const currentUser = useAuthStore((state) => state.currentUser);

  const { data, isLoading, isError, error } = useQuery<OrderListResponse>({
    queryKey: ['admin-orders', currentUser.adUsername],
    queryFn: getOrders,
  });

  const orders = data?.orders ?? [];

  const handleOrderClick = (id: string) => {
    navigate(`/admin/order/${id}`);
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
        {/* Page heading */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            ניהול ההזמנות
          </Typography>

          <Typography color="text.secondary">צפייה וניהול של כלל ההזמנות במערכת.</Typography>
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
              אין הזמנות להצגה
            </Typography>

            <Typography color="text.secondary">הזמנות חדשות שייווצרו במערכת יופיעו כאן.</Typography>
          </Box>
        )}

        {/* Orders table */}
        {!isLoading && !isError && orders.length > 0 && (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: 'none',
            }}
          >
            {/* Desktop headings */}
            <Box
              sx={{
                display: {
                  xs: 'none',
                  md: 'grid',
                },
                gridTemplateColumns: '1.1fr 1.2fr 1.2fr 1fr 1fr 1.3fr 40px',
                alignItems: 'center',
                px: 3,
                py: 2,
                bgcolor: 'action.hover',
                direction: 'ltr',
                gap: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                מספר הזמנה
              </Typography>

              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                מזמין
              </Typography>

              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                יחידה
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
                      md: '1.1fr 1.2fr 1.2fr 1fr 1fr 1.3fr 40px',
                    },

                    gridTemplateAreas: {
                      xs: `
                        "order arrow"
                        "requester arrow"
                        "details arrow"
                      `,
                      md: '"order requester unit date price status arrow"',
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

                  {/* Requester */}
                  <Box sx={{ gridArea: 'requester' }}>
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
                      מזמין
                    </Typography>

                    <Typography variant="body2" fontWeight={600}>
                      {order.requester?.fullName ?? '-'}
                    </Typography>
                  </Box>

                  {/* Unit */}
                  <Typography
                    variant="body2"
                    sx={{
                      gridArea: 'unit',
                      display: {
                        xs: 'none',
                        md: 'block',
                      },
                    }}
                  >
                    {order.unit || order.requester?.unit || '-'}
                  </Typography>

                  {/* Mobile details */}
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

                    {/* Mobile unit */}
                    <Box
                      sx={{
                        display: {
                          xs: 'block',
                          md: 'none',
                        },
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        יחידה
                      </Typography>

                      <Typography variant="body2">
                        {order.unit || order.requester?.unit || '-'}
                      </Typography>
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
