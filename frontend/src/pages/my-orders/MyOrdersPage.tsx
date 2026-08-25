import { useState } from 'react';

import { Box, Container, Divider, Paper, Typography } from '@mui/material';

import StatusBadge from '../../components/StatusBadge';
import type { OrderStatus } from 'shared-types';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import OrderDetailsModal from '../../components/orders/OrderDetailsModal';

interface MyOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalPrice: number;
  status: OrderStatus;
}

const mockOrders: MyOrder[] = [
  {
    id: '60000000-0000-0000-0000-000000000001',
    orderNumber: 'ORD-1001',
    createdAt: '2026-08-20T09:00:00.000Z',
    totalPrice: 315,
    status: 'PENDING_BUDGET',
  },
  {
    id: '60000000-0000-0000-0000-000000000002',
    orderNumber: 'ORD-1002',
    createdAt: '2026-08-14T08:00:00.000Z',
    totalPrice: 220,
    status: 'IN_PRINTING',
  },
  {
    id: '60000000-0000-0000-0000-000000000003',
    orderNumber: 'ORD-1003',
    createdAt: '2026-08-05T08:30:00.000Z',
    totalPrice: 195,
    status: 'COMPLETED',
  },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

function formatPrice(price: number | string) {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 2,
  }).format(Number(price));
}

export default function MyOrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const orders = mockOrders;

  const handleOrderClick = (orderId: string) => {
    setSelectedOrderId(orderId);

    // Later:
    // Open OrderDetailsModel here.
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

        {/* No orders */}
        {orders.length === 0 && (
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
        {orders.length > 0 && (
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

            {orders.map((order, index) => {
              return (
                <Box key={order.id}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => handleOrderClick(order.id)}
                    sx={{
                      width: '100%',
                      border: 0,
                      bgcolor:
                        selectedOrderId === order.id ? 'action.selected' : 'background.paper',
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
              );
            })}
          </Paper>
        )}
        <OrderDetailsModal
          open={selectedOrderId !== null}
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      </Container>
    </Box>
  );
}
