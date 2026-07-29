import express, { Request, Response } from 'express';
// Test workspace reference imports
import { User, OrderStatus } from 'shared-types';
import { testDbConnection } from './config/db';
import logger from './utils/logger';
import authRoutes from './routes/auth.routes';
import pricingRoutes from './routes/pricing.routes';

// 1. Import Catalog Routes
import catalogRouter from './routes/catalog.routes';
import adminCatalogRouter from './routes/admin-catalog.routes';
import fileRouter from './routes/file.routes';

const app = express();
const port = process.env.PORT || 3001;

app.use("/api/auth", authRoutes);

app.use(express.json());

// Authentication routes
app.use('/api/auth', authRoutes);

// File routes
app.use('/api/files', fileRouter);

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
  };

  const initialStatus: OrderStatus = 'PENDING_BUDGET';

  res.json({
    user: demoUser,
    defaultStatus: initialStatus,
  });
});

// 2. Register Catalog routes
app.use('/api/products', catalogRouter);
app.use('/api/admin/products', adminCatalogRouter);

// 3. Register Pricing routes
app.use('/api/pricing', pricingRoutes);

app.listen(port, async () => {
  logger.info(`Backend server is running on port ${port}`);
  try {
    await testDbConnection();
  } catch (err) {
    logger.error('Startup database connection test failed', { error: err });
  }
});

export default app;
