import express, { Request, Response } from 'express';
// Test workspace reference imports
import { User, OrderStatus } from 'shared-types';
import { testDbConnection } from './config/db';
import authRoutes from "./routes/auth.routes";

const app = express();
const port = process.env.PORT || 3001;

app.use("/api/auth", authRoutes);

app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
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
    fullName: 'עמית ישראלי',
    militaryEmail: 'amit.israeli@mail.idf.il',
    adUsername: 'amit_israeli',
    unit: 'מרכז פיתוח',
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

app.listen(port, async () => {
  console.info(`Backend server is running on port ${port}`);
  try {
    await testDbConnection();
  } catch (err) {
    console.error('Startup database connection test failed:', err);
  }
});

export default app;
