import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Container, Typography } from '@mui/material';
import type { GridSortModel } from '@mui/x-data-grid';

import type { OrderQueryParams, OrderStatus } from 'shared-types';

import { getOrders } from '../../../services/api/orders.service';
import { useAuthStore } from '../../../store/useAuthStore';
import OrdersDataGrid from '../../../components/admin/OrdersDataGrid';
import OrderTableFilters from '../../../components/admin/OrderTableFilters';

const PAGE_SIZE = 20;

const DEFAULT_SORT_MODEL: GridSortModel = [
  {
    field: 'createdAt',
    sort: 'desc',
  },
];

const isSupportedSortField = (field: string): field is NonNullable<OrderQueryParams['sortBy']> => {
  return ['createdAt', 'orderNumber', 'totalPrice', 'status', 'requesterName', 'unit'].includes(
    field
  );
};

export default function OrdersTablePage() {
  const navigate = useNavigate();

  const currentUser = useAuthStore((state) => state.currentUser);

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | undefined>(undefined);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [sortModel, setSortModel] = useState<GridSortModel>(DEFAULT_SORT_MODEL);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [search]);

  const activeSort = sortModel[0];

  const sortBy: NonNullable<OrderQueryParams['sortBy']> =
    activeSort && isSupportedSortField(activeSort.field) ? activeSort.field : 'createdAt';

  const sortOrder: NonNullable<OrderQueryParams['sortOrder']> =
    activeSort?.sort === 'asc' ? 'asc' : 'desc';

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: [
        'admin-orders',
        currentUser.adUsername,
        selectedStatus,
        debouncedSearch,
        sortBy,
        sortOrder,
      ],

      initialPageParam: 1,

      queryFn: ({ pageParam }) =>
        getOrders({
          page: pageParam,
          limit: PAGE_SIZE,
          status: selectedStatus,
          search: debouncedSearch || undefined,
          sortBy,
          sortOrder,
        }),

      getNextPageParam: (lastPage) => {
        if (lastPage.page >= lastPage.totalPages) {
          return undefined;
        }

        return lastPage.page + 1;
      },
    });

  const orders = useMemo(() => data?.pages.flatMap((page) => page.orders) ?? [], [data]);

  const handleOrderClick = (id: string) => {
    navigate(`/admin/order/${id}`);
  };

  const handleStatusChange = (status?: OrderStatus) => {
    setSelectedStatus(status);
  };

  const handleSortModelChange = (model: GridSortModel) => {
    if (model.length === 0) {
      setSortModel(DEFAULT_SORT_MODEL);
      return;
    }

    const nextSort = model[0];

    if (!isSupportedSortField(nextSort.field)) {
      return;
    }

    setSortModel(model);
  };

  const handleLoadMore = () => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    void fetchNextPage();
  };

  const resetKey = [selectedStatus ?? 'all', debouncedSearch, sortBy, sortOrder].join('-');

  return (
    <Box
      sx={{
        minHeight: '100%',
        bgcolor: 'background.paper',
        py: {
          xs: 3,
          md: 5,
        },
        direction: 'ltr',
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            ניהול ההזמנות
          </Typography>

          <Typography color="text.secondary">צפייה וניהול של כלל ההזמנות במערכת.</Typography>
        </Box>

        <OrderTableFilters
          selectedStatus={selectedStatus}
          onStatusChange={handleStatusChange}
          search={search}
          onSearchChange={setSearch}
        />

        {isError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error instanceof Error ? error.message : 'אירעה שגיאה בטעינת ההזמנות'}
          </Alert>
        )}

        {!isError && (
          <OrdersDataGrid
            key={resetKey}
            orders={orders}
            loading={isLoading}
            loadingMore={isFetchingNextPage}
            hasNextPage={Boolean(hasNextPage)}
            sortModel={sortModel}
            onSortModelChange={handleSortModelChange}
            onLoadMore={handleLoadMore}
            onOrderClick={handleOrderClick}
          />
        )}
      </Container>
    </Box>
  );
}
