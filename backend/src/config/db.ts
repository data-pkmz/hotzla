import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function testDbConnection() {
  try {
    await prisma.$connect();
    console.log('Database connection established successfully via Prisma.');
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    throw error;
  }
}
