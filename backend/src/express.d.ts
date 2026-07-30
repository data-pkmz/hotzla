import 'express';

declare global {
  namespace Express {
    interface User {
      adUsername: string;
      authMethod: 'mock' | 'iwa';
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
