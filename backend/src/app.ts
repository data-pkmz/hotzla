import 'dotenv/config';
import express, { Request, Response } from 'express';
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
import userManagementRoutes from './routes/user-management.routes';

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

app.use('/api/admin/users', userManagementRoutes);

// Basic health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  logger.info('Health check endpoint requested');

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'backend',
  });
});

export default app;
