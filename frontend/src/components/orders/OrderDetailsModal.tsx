import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

import type { OrderStatus } from 'shared-types';

import StatusBadge from '../StatusBadge';

interface OrderDetailsModalProps {
  open: boolean;
  orderId: string | null;
  onClose: () => void;
}

interface OrderAttribute {
  name: string;
  value: string;
}

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  attributes: OrderAttribute[];
  fileName?: string;
}

interface OrderContact {
  name: string;
  role: string;
  email?: string;
}

interface OrderStatusHistoryEntry {
  id: string;
  status: OrderStatus;
  changedAt: string;
  note?: string;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalPrice: number;
  status: OrderStatus;
  items: OrderItem[];
  contacts: OrderContact[];
  statusHistory: OrderStatusHistoryEntry[];
}

const mockOrderDetails: Record<string, OrderDetails> = {
  '60000000-0000-0000-0000-000000000001': {
    id: '60000000-0000-0000-0000-000000000001',
    orderNumber: 'ORD-1001',
    createdAt: '2026-08-20T09:00:00.000Z',
    totalPrice: 315,
    status: 'PENDING_BUDGET',

    items: [
      {
        id: '70000000-0000-0000-0000-000000000001',
        productName: 'מחברות',
        quantity: 5,
        totalPrice: 315,
        attributes: [
          {
            name: 'גודל',
            value: 'A4',
          },
        ],
        fileName: 'notebook-design.pdf',
      },
    ],

    contacts: [
      {
        name: 'משתמש מבקש',
        role: 'מזמין',
        email: 'requester@example.com',
      },
      {
        name: 'מנהל מערכת',
        role: 'מנהל',
        email: 'manager@example.com',
      },
    ],

    statusHistory: [
      {
        id: 'status-1001-1',
        status: 'PENDING_BUDGET',
        changedAt: '2026-08-20T09:00:00.000Z',
        note: 'ההזמנה נוצרה ונשלחה לאישור תקציבי.',
      },
    ],
  },

  '60000000-0000-0000-0000-000000000002': {
    id: '60000000-0000-0000-0000-000000000002',
    orderNumber: 'ORD-1002',
    createdAt: '2026-08-14T08:00:00.000Z',
    totalPrice: 220,
    status: 'IN_PRINTING',

    items: [
      {
        id: '70000000-0000-0000-0000-000000000002',
        productName: 'כרטיסי ביקור',
        quantity: 2,
        totalPrice: 100,
        attributes: [],
        fileName: 'business-card.pdf',
      },
      {
        id: '70000000-0000-0000-0000-000000000003',
        productName: 'מחברות',
        quantity: 2,
        totalPrice: 120,
        attributes: [
          {
            name: 'גודל',
            value: 'A5',
          },
        ],
        fileName: 'notebook-cover.png',
      },
    ],

    contacts: [
      {
        name: 'משתמש מבקש',
        role: 'מזמין',
        email: 'requester@example.com',
      },
      {
        name: 'מנהל מערכת',
        role: 'מנהל',
        email: 'manager@example.com',
      },
      {
        name: 'עובד דפוס',
        role: 'עובד דפוס',
        email: 'worker@example.com',
      },
    ],

    statusHistory: [
      {
        id: 'status-1002-1',
        status: 'PENDING_BUDGET',
        changedAt: '2026-08-14T08:00:00.000Z',
      },
      {
        id: 'status-1002-2',
        status: 'BUDGET_APPROVED',
        changedAt: '2026-08-14T12:00:00.000Z',
      },
      {
        id: 'status-1002-3',
        status: 'APPROVED_FOR_PRODUCTION',
        changedAt: '2026-08-15T10:30:00.000Z',
      },
      {
        id: 'status-1002-4',
        status: 'IN_PRINTING',
        changedAt: '2026-08-16T07:30:00.000Z',
        note: 'ההזמנה הועברה להדפסה.',
      },
    ],
  },

  '60000000-0000-0000-0000-000000000003': {
    id: '60000000-0000-0000-0000-000000000003',
    orderNumber: 'ORD-1003',
    createdAt: '2026-08-05T08:30:00.000Z',
    totalPrice: 195,
    status: 'COMPLETED',

    items: [
      {
        id: '70000000-0000-0000-0000-000000000004',
        productName: 'נייר מכתבים',
        quantity: 3,
        totalPrice: 120,
        attributes: [],
        fileName: 'letterhead.pdf',
      },
      {
        id: '70000000-0000-0000-0000-000000000005',
        productName: 'מחברות',
        quantity: 1,
        totalPrice: 75,
        attributes: [
          {
            name: 'גודל',
            value: 'A4',
          },
        ],
        fileName: 'notebook.pdf',
      },
    ],

    contacts: [
      {
        name: 'משתמש מבקש',
        role: 'מזמין',
        email: 'requester@example.com',
      },
      {
        name: 'מנהל מערכת',
        role: 'מנהל',
        email: 'manager@example.com',
      },
      {
        name: 'עובד דפוס',
        role: 'עובד דפוס',
        email: 'worker@example.com',
      },
    ],

    statusHistory: [
      {
        id: 'status-1003-1',
        status: 'PENDING_BUDGET',
        changedAt: '2026-08-05T08:30:00.000Z',
      },
      {
        id: 'status-1003-2',
        status: 'BUDGET_APPROVED',
        changedAt: '2026-08-05T13:00:00.000Z',
      },
      {
        id: 'status-1003-3',
        status: 'APPROVED_FOR_PRODUCTION',
        changedAt: '2026-08-06T11:00:00.000Z',
      },
      {
        id: 'status-1003-4',
        status: 'IN_PRINTING',
        changedAt: '2026-08-07T07:30:00.000Z',
      },
      {
        id: 'status-1003-5',
        status: 'READY_FOR_PICKUP',
        changedAt: '2026-08-09T12:00:00.000Z',
      },
      {
        id: 'status-1003-6',
        status: 'COMPLETED',
        changedAt: '2026-08-10T14:30:00.000Z',
        note: 'ההזמנה נאספה והושלמה.',
      },
    ],
  },
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 2,
  }).format(price);
}

export default function OrderDetailsModal({ open, orderId, onClose }: OrderDetailsModalProps) {
  const order = orderId ? mockOrderDetails[orderId] : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      {!order ? (
        <DialogContent>
          <Typography textAlign="center">לא נמצאו פרטי הזמנה.</Typography>
        </DialogContent>
      ) : (
        <>
          {/* Header */}
          <DialogTitle
            sx={{
              px: {
                xs: 2.5,
                md: 4,
              },
              py: 3,
              direction: 'ltr',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                    mb: 0.5,
                  }}
                >
                  <Typography variant="h5" component="h2" fontWeight={700}>
                    הזמנה #{order.orderNumber}
                  </Typography>

                  <StatusBadge status={order.status} />
                </Box>

                <Typography variant="body2" color="text.secondary">
                  נפתחה בתאריך {formatDate(order.createdAt)}
                </Typography>
              </Box>

              <IconButton
                onClick={onClose}
                aria-label="סגירת פרטי הזמנה"
                sx={{
                  mt: -0.5,
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <Divider />

          <DialogContent
            sx={{
              p: {
                xs: 2.5,
                md: 4,
              },
              bgcolor: 'background.default',
              direction: 'ltr',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'minmax(0, 2fr) minmax(280px, 1fr)',
                },
                gap: 3,
                alignItems: 'start',
              }}
            >
              {/* Main order information */}
              <Stack spacing={3}>
                {/* Specifications */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: {
                      xs: 2.5,
                      md: 3,
                    },
                    borderRadius: 3,
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{
                      mb: 2.5,
                    }}
                  >
                    מפרט טכני
                  </Typography>

                  <Divider sx={{ my: 2.5 }} />

                  <Stack spacing={2.5} divider={<Divider flexItem />}>
                    {order.items.map((item) => (
                      <Box key={item.id}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 2,
                            mb: 2,
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {item.productName}
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                              כמות: {item.quantity}
                            </Typography>
                          </Box>

                          <Typography fontWeight={700}>{formatPrice(item.totalPrice)}</Typography>
                        </Box>

                        {item.attributes.length > 0 && (
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, minmax(0, 1fr))',
                              },
                              gap: 1.5,
                            }}
                          >
                            {item.attributes.map((attribute) => (
                              <Box
                                key={`${item.id}-${attribute.name}`}
                                sx={{
                                  p: 1.5,
                                  bgcolor: 'rgba(25, 118, 210, 0.05)',
                                  border: '.5px solid',
                                  borderColor: 'rgb(211, 211, 211)',
                                  borderRadius: 1.5,
                                }}
                              >
                                <Typography variant="caption" color="text.secondary">
                                  {attribute.name}
                                </Typography>

                                <Typography variant="body2" fontWeight={600}>
                                  {attribute.value}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Stack>

                  <Divider sx={{ my: 2.5 }} />

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography fontWeight={700}>סה״כ הזמנה</Typography>

                    <Typography variant="h6" fontWeight={700}>
                      {formatPrice(order.totalPrice)}
                    </Typography>
                  </Box>
                </Paper>

                {/* Source files */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: {
                      xs: 2.5,
                      md: 3,
                    },
                    borderRadius: 3,
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{
                      mb: 2,
                    }}
                  >
                    קבצי מקור
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack spacing={1.5} divider={<Divider flexItem />}>
                    {order.items
                      .filter((item) => item.fileName)
                      .map((item) => (
                        <Box
                          key={`${item.id}-file`}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1.5,
                            bgcolor: 'rgba(25, 118, 210, 0.1)',
                            border: '1.5px solid',
                            borderColor: 'rgb(192, 192, 192)',
                            borderRadius: 1,
                            gap: 2,
                            py: 1.5,
                          }}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {item.fileName}
                            </Typography>

                            <Typography variant="caption" color="text.secondary">
                              {item.productName}
                            </Typography>
                          </Box>

                          <IconButton size="small" aria-label={`הורדת ${item.fileName}`} disabled>
                            <DownloadOutlinedIcon />
                          </IconButton>
                        </Box>
                      ))}
                  </Stack>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      p: 1.5,
                      bgcolor: 'rgba(25, 118, 210, 0.1)',
                      borderRadius: 1,
                      mt: 2,
                    }}
                  >
                    הורדת קבצים תחובר כאשר שירות ההזמנות יהיה זמין.
                  </Typography>
                </Paper>
              </Stack>

              {/* Side column */}
              <Stack spacing={3}>
                {/* Contacts */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 3,
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{
                      mb: 2,
                    }}
                  >
                    אנשי קשר
                  </Typography>

                  <Stack spacing={2} divider={<Divider flexItem />}>
                    {order.contacts.map((contact) => (
                      <Box key={`${contact.role}-${contact.name}`}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 0.5,
                          }}
                        >
                          <PersonOutlineIcon fontSize="small" color="action" />

                          <Typography fontWeight={700}>{contact.name}</Typography>
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 0.5,
                          }}
                        >
                          {contact.role}
                        </Typography>

                        {contact.email && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                            }}
                          >
                            <EmailOutlinedIcon
                              sx={{
                                fontSize: 16,
                                color: 'text.secondary',
                              }}
                            />

                            <Link
                              href={`mailto:${contact.email}`}
                              underline="hover"
                              variant="body2"
                            >
                              {contact.email}
                            </Link>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Paper>

                {/* Status timeline */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 3,
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{
                      mb: 2.5,
                    }}
                  >
                    ציר זמן
                  </Typography>

                  <Stack spacing={0}>
                    {order.statusHistory.map((entry, index) => {
                      const isLast = index === order.statusHistory.length - 1;

                      return (
                        <Box
                          key={entry.id}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '20px 1fr',
                            gap: 1.5,
                            minHeight: isLast ? 'auto' : 92,
                          }}
                        >
                          {/* Timeline line */}
                          <Box
                            sx={{
                              position: 'relative',
                              display: 'flex',
                              justifyContent: 'center',
                            }}
                          >
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                mt: 0.8,
                                borderRadius: '50%',
                                bgcolor: isLast ? 'primary.main' : 'grey.400',
                                zIndex: 1,
                              }}
                            />

                            {!isLast && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 14,
                                  bottom: 0,
                                  width: 2,
                                  bgcolor: 'divider',
                                }}
                              />
                            )}
                          </Box>

                          <Box
                            sx={{
                              pb: isLast ? 0 : 2,
                            }}
                          >
                            <StatusBadge status={entry.status} />

                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                mt: 0.75,
                              }}
                            >
                              {formatDate(entry.changedAt)}
                            </Typography>

                            {entry.note && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mt: 0.5,
                                }}
                              >
                                {entry.note}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              </Stack>
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
