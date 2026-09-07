import 'express';
import { User as PrismaUser } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      adUsername: string;
      authMethod: 'mock' | 'iwa';
    }

    interface Request {
      user?: User;
      dbUser?: PrismaUser;
    }
  }
}

export {};
