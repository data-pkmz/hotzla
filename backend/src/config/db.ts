import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import logger from '../utils/logger.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export async function testDbConnection() {
  try {
    await prisma.$connect();
    logger.info('Database connection established successfully via Prisma.');
  } catch (error) {
    logger.error('Failed to connect to the database:', { error });
    throw error;
  }
}
