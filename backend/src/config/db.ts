import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import logger from '../utils/logger';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,

  /**
   * Maximum number of PostgreSQL connections available to this backend
   * process at the same time.
   *
   * node-postgres defaults to 10, which is fairly small for the load-test
   * workload. Keep this configurable so staging/production can choose a
   * value appropriate for the database server.
   */
  max: Number(process.env.DB_POOL_MAX ?? 20),

  /**
   * Close connections that have remained idle for this amount of time.
   */
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30_000),

  /**
   * Do not wait indefinitely when PostgreSQL cannot provide a connection.
   */
  connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? 5_000),
});

const adapter = new PrismaPg(pool, {
  disposeExternalPool: true,
});

export const prisma = new PrismaClient({
  adapter,
});

export async function testDbConnection() {
  try {
    await prisma.$connect();

    logger.info('Database connection established successfully via Prisma.');
  } catch (error) {
    logger.error('Failed to connect to the database:', {
      error,
    });

    throw error;
  }
}
