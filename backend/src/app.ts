import 'dotenv/config';
import express, { Request, Response } from 'express';
import { User, OrderStatus } from 'shared-types';
import logger from './utils/logger';

import authRoutes from './routes/auth.routes';
import pricingRoutes from './routes/pricing.routes';
import managerRoutes from './routes/manager.routes';
import catalogRouter from './routes/catalog.routes';
import adminCatalogRouter from './routes/admin-catalog.routes';
import fileRouter from './routes/file.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import publicRoutes from './routes/public.routes';
import workerRoutes from './routes/worker.routes';

const app = express();

app.use(express.json());

// API routes
app.use('/api', authRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/public', publicRoutes);

app.use('/api/products', catalogRouter);
app.use('/api/admin/products', adminCatalogRouter);
app.use('/api/files', fileRouter);

app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/orders', managerRoutes);
app.use('/api/orders', workerRoutes);

// Basic health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  logger.info('Health check endpoint requested');

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'backend',
  });
});

// Demo route using shared types
app.get('/api/demo-user', (_req: Request, res: Response) => {
  const demoUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    fullName: 'Amit Israeli',
    militaryEmail: 'amit.israeli@mail.idf.il',
    adUsername: 'amit_israeli',
    unit: 'Development Center',
    phone: '050-1234567',
    role: 'REQUESTER',
    createdAt: new Date(),
    isDeleted: false,
  };

  const initialStatus: OrderStatus = 'PENDING_BUDGET';

  res.json({
    user: demoUser,
    defaultStatus: initialStatus,
  });
});

export default app;
