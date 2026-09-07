import 'express';
import type { User as SharedUser } from 'shared-types';

declare global {
  namespace Express {
    interface User {
      adUsername: string;
      authMethod: 'mock' | 'iwa';
    }

    interface Request {
      user?: User;
      dbUser?: SharedUser;
    }
  }
}

export {};
