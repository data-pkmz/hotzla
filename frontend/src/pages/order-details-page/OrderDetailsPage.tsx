import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import {
  Alert,
  Box,
  Breadcrumbs,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

import type { OrderDetails } from 'shared-types';

import StatusBadge from '../../components/StatusBadge';
import { getOrderById } from '../../services/api/orders.service';

interface OrderDetailsLocationState {
  from?: string;
  fromLabel?: string;
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatPrice(price: number | string) {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 2,
  }).format(Number(price));
}

function getFileName(filePath: string) {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}

export default function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();

  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as OrderDetailsLocationState | null;

  const backPath = locationState?.from ?? '/my-orders';
  const backLabel = locationState?.fromLabel ?? 'ההזמנות שלי';

  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useQuery<OrderDetails>({
    queryKey: ['order-details', orderId],
    queryFn: () => getOrderById(orderId!),
    enabled: Boolean(orderId),
  });

  const contacts = order
    ? [
        {
          id: `requester-${order.requester.id}`,
          name: order.requester.fullName ?? 'מזמין',
          role: 'מזמין',
          email: order.requester.militaryEmail,
        },
        {
          id: 'budget-officer',
          name: order.budgetOfficerName,
          role: 'קצין תקציב',
          email: order.budgetOfficerEmail,
        },
        ...(order.approvedByManager
          ? [
              {
                id: `manager-${order.approvedByManager.id}`,
                name: order.approvedByManager.fullName ?? 'מנהל',
                role: 'מנהל',
                email: order.approvedByManager.militaryEmail,
              },
            ]
          : []),
        ...(order.worker
          ? [
              {
                id: `worker-${order.worker.id}`,
                name: order.worker.fullName ?? 'עובד דפוס',
                role: 'עובד דפוס',
                email: order.worker.militaryEmail,
              },
            ]
          : []),
      ]
    : [];

  const uploadedItems =
    order?.itemEntries.filter((item) => item.uploadedFilePath.trim() !== '') ?? [];

  return (
    <Box
      sx={{
        minHeight: '100%',
        bgcolor: 'background.default',
        py: {
          xs: 3,
          md: 5,
        },
      }}
    >
      <Container maxWidth="xl">
        {/* Navigation */}
        <Breadcrumbs
          separator="›"
          sx={{
            mb: 3,
            direction: 'ltr',
          }}
        >
          <Link
            component="button"
            type="button"
            color="inherit"
            onClick={() => navigate(backPath)}
            sx={{
              cursor: 'pointer',
              font: 'inherit',
              textDecoration: 'underline',
            }}
          >
            {backLabel}
          </Link>

          <Typography color="#3a36ab">
            {order ? `הזמנה #${order.orderNumber}` : 'פרטי הזמנה'}
          </Typography>
        </Breadcrumbs>

        {isLoading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 10,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {isError && (
          <Alert severity="error">
            {error instanceof Error ? error.message : 'אירעה שגיאה בטעינת פרטי ההזמנה'}
          </Alert>
        )}

        {!isLoading && !isError && !order && <Alert severity="warning">לא נמצאו פרטי הזמנה.</Alert>}

        {!isLoading && !isError && order && (
          <>
            {/* Page header */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 2,
                mb: 3,
                direction: 'ltr',
              }}
            >
              <Box>
                <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                  פרטי הזמנה #{order.orderNumber}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  נפתחה בתאריך {formatDate(order.createdAt)}
                </Typography>
              </Box>

              <StatusBadge status={order.status} />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'minmax(0, 2fr) minmax(280px, 1fr)',
                },
                gap: 3,
                alignItems: 'start',
                direction: 'ltr',
              }}
            >
              {/* Main column */}
              <Stack spacing={3}>
                {/* Technical specifications */}
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
                  <Typography variant="h6" fontWeight={700}>
                    מפרט טכני
                  </Typography>

                  <Divider sx={{ my: 2.5 }} />

                  <Stack spacing={2.5} divider={<Divider flexItem />}>
                    {order.itemEntries.map((item) => (
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
                              {item.product.name}
                            </Typography>
                          </Box>

                          <Typography fontWeight={700}>
                            {formatPrice(item.computedTotalPrice)}
                          </Typography>
                        </Box>

                        <Divider sx={{ my: 1.5 }} />

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
                          {/* Quantity */}
                          <Box
                            sx={{
                              p: 1.5,
                              bgcolor: 'rgba(25, 118, 210, 0.05)',
                              border: '0.5px solid',
                              borderColor: 'rgb(211, 211, 211)',
                              borderRadius: 1.5,
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              כמות
                            </Typography>

                            <Typography variant="subtitle1" fontWeight={700}>
                              {Number(item.quantity)}
                            </Typography>
                          </Box>
                          {item.itemAttributeEntries.map((attribute) => (
                            <Box
                              key={attribute.id}
                              sx={{
                                p: 1.5,
                                bgcolor: 'rgba(25, 118, 210, 0.05)',
                                border: '0.5px solid',
                                borderColor: 'rgb(211, 211, 211)',
                                borderRadius: 1.5,
                              }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                {attribute.attributeDefinition.attributeName}
                              </Typography>

                              <Typography variant="subtitle1" fontWeight={700}>
                                {attribute.selectedOption?.optionLabel ||
                                  attribute.valueText ||
                                  '-'}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
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
                  <Typography variant="h6" fontWeight={700}>
                    קבצי מקור
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  {uploadedItems.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      לא צורפו קבצי מקור להזמנה זו.
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {uploadedItems.map((item) => {
                        const fileName = getFileName(item.uploadedFilePath);

                        return (
                          <Box
                            key={`${item.id}-file`}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              p: 1.5,
                              bgcolor: 'rgba(25, 118, 210, 0.05)',
                              border: '1.5px solid',
                              borderColor: 'rgb(192, 192, 192)',
                              borderRadius: 1,
                              gap: 2,
                            }}
                          >
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {fileName}
                              </Typography>

                              <Typography variant="caption" color="text.secondary">
                                {item.product.name}
                              </Typography>
                            </Box>

                            <IconButton size="small" aria-label={`הורדת ${fileName}`} disabled>
                              <DownloadOutlinedIcon />
                            </IconButton>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
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
                  <Typography variant="h6" fontWeight={700}>
                    אנשי קשר
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack spacing={2} divider={<Divider flexItem />}>
                    {contacts.map((contact) => (
                      <Box key={contact.id}>
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

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
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

                {/* Status history */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 3,
                  }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    ציר זמן
                  </Typography>

                  <Divider sx={{ my: 2.5 }} />

                  {order.orderStatus.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      אין היסטוריית סטטוסים להצגה.
                    </Typography>
                  ) : (
                    <Stack spacing={0}>
                      {order.orderStatus.map((entry, index) => {
                        const isLast = index === order.orderStatus.length - 1;

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
                              <StatusBadge status={entry.toStatus} />

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

                              {entry.changedByUser?.fullName && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    display: 'block',
                                    mt: 0.25,
                                  }}
                                >
                                  עודכן על ידי {entry.changedByUser.fullName}
                                </Typography>
                              )}

                              {entry.note && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  {entry.note}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Paper>
              </Stack>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}
