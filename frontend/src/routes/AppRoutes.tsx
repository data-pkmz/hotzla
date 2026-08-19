import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { CatalogPage } from '../pages/catalog';
import { ProductDetailPage } from '../pages/product-detail';
import { CartPage } from '../pages/cart';
import { CheckoutPage } from '../pages/checkout';
import { MyOrdersPage } from '../pages/my-orders';
import { OrdersTablePage } from '../pages/admin/orders-table';
import { OrderDetailPage } from '../pages/admin/order-detail';
import { ProductBuilderPage } from '../pages/admin/product-builder';
import { OrderDetailsPage } from '../pages/order-details-page';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/my-orders" element={<MyOrdersPage />} />
      <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
      <Route path="/admin/orders" element={<OrdersTablePage />} />
      <Route path="/admin/order/:id" element={<OrderDetailPage />} />
      <Route path="/admin/builder" element={<ProductBuilderPage />} />
    </Routes>
  );
};
