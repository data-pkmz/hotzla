import { useEffect, useRef } from 'react';
import { Box, CircularProgress, Paper } from '@mui/material';
import { DataGrid, type GridColDef, type GridSortModel } from '@mui/x-data-grid';

import type { Order } from 'shared-types';

import StatusBadge from '../StatusBadge';
import { formatDate, formatPrice } from '../../utils/formatting';

interface OrdersDataGridProps {
  orders: Order[];
  loading: boolean;
  loadingMore: boolean;
  hasNextPage: boolean;
  sortModel: GridSortModel;
  onSortModelChange: (model: GridSortModel) => void;
  onLoadMore: () => void;
  onOrderClick: (id: string) => void;
}

const columns: GridColDef<Order>[] = [
  {
    field: 'orderNumber',
    headerName: 'מספר הזמנה',
    flex: 1,
    minWidth: 150,
    sortable: true,
    align: 'left',
    headerAlign: 'left',
  },
  {
    field: 'requesterName',
    headerName: 'מזמין',
    flex: 1.2,
    minWidth: 170,
    sortable: true,
    align: 'left',
    headerAlign: 'left',
    renderCell: (params) => params.row.requester?.fullName ?? '-',
  },
  {
    field: 'unit',
    headerName: 'יחידה',
    flex: 1,
    minWidth: 140,
    sortable: true,
    align: 'left',
    headerAlign: 'left',
    renderCell: (params) => params.row.unit || params.row.requester?.unit || '-',
  },
  {
    field: 'createdAt',
    headerName: 'תאריך יצירה',
    flex: 1,
    minWidth: 150,
    sortable: true,
    align: 'left',
    headerAlign: 'left',
    renderCell: (params) => formatDate(params.row.createdAt),
  },
  {
    field: 'totalPrice',
    headerName: 'סכום',
    flex: 1,
    minWidth: 130,
    sortable: true,
    align: 'left',
    headerAlign: 'left',
    renderCell: (params) => formatPrice(params.row.totalPrice),
  },
  {
    field: 'status',
    headerName: 'סטטוס',
    flex: 1.2,
    minWidth: 190,
    sortable: true,
    align: 'left',
    headerAlign: 'left',
    renderCell: (params) => <StatusBadge status={params.row.status} />,
  },
];

export default function OrdersDataGrid({
  orders,
  loading,
  loadingMore,
  hasNextPage,
  sortModel,
  onSortModelChange,
  onLoadMore,
  onOrderClick,
}: OrdersDataGridProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element || !hasNextPage || loadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, loadingMore, onLoadMore]);

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: 'none',
      }}
    >
      <DataGrid
        autoHeight
        rows={orders}
        columns={columns}
        loading={loading}
        sortingMode="server"
        sortModel={sortModel}
        sortingOrder={['asc', 'desc']}
        onSortModelChange={onSortModelChange}
        onRowClick={(params) => onOrderClick(String(params.id))}
        hideFooter
        disableRowSelectionOnClick
        disableColumnMenu
        rowHeight={64}
        columnHeaderHeight={56}
        sx={{
          direction: 'ltr',
          border: 0,

          '& .MuiDataGrid-columnHeaders': {
            bgcolor: 'action.hover',
          },

          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 700,
          },

          '& .MuiDataGrid-row': {
            cursor: 'pointer',
          },

          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
            outline: 'none',
          },

          '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
            outline: 'none',
          },
        }}
      />

      <Box ref={loadMoreRef} sx={{ height: 1 }} />

      {loadingMore && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 2,
          }}
        >
          <CircularProgress size={22} />
        </Box>
      )}
    </Paper>
  );
}
