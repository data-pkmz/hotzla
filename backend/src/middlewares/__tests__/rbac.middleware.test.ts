import type { NextFunction, Request, Response } from 'express';

import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

import { requireRoles } from '../rbac.middleware';
import { AuthService } from '../../services/auth.service';
import logger from '../../utils/logger';

jest.mock('../../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Test User',
  militaryEmail: 'test_user@idf.il',
  adUsername: 'test_user',
  unit: 'TEST_UNIT',
  phone: '0500000000',
  role: Role.REQUESTER,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  isDeleted: false,
  ...overrides,
});

describe('RBAC Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();

    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const middleware = requireRoles([Role.MANAGER]);

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: User not authenticated',
    });

    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if user is deactivated', async () => {
    req.user = {
      adUsername: 'test_user',
      authMethod: 'mock',
    };

    const mockDbUser = makeUser({
      adUsername: 'test_user',
      role: Role.REQUESTER,
      isDeleted: true,
    });

    jest.spyOn(AuthService.prototype, 'getOrCreateUser').mockResolvedValue(mockDbUser);

    const middleware = requireRoles([Role.MANAGER]);

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized: User deactivated',
    });

    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 Forbidden if user does not have the required role', async () => {
    req.user = {
      adUsername: 'test_user',
      authMethod: 'mock',
    };

    const mockDbUser = makeUser({
      adUsername: 'test_user',
      role: Role.REQUESTER,
      isDeleted: false,
    });

    jest.spyOn(AuthService.prototype, 'getOrCreateUser').mockResolvedValue(mockDbUser);

    const middleware = requireRoles([Role.MANAGER, Role.WORKER]);

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden: Insufficient permissions',
    });

    expect(logger.warn).toHaveBeenCalled();

    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() and attach dbUser if user has the exact required role', async () => {
    req.user = {
      adUsername: 'test_manager',
      authMethod: 'mock',
    };

    const mockDbUser = makeUser({
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'Test Manager',
      militaryEmail: 'test_manager@idf.il',
      adUsername: 'test_manager',
      role: Role.MANAGER,
    });

    jest.spyOn(AuthService.prototype, 'getOrCreateUser').mockResolvedValue(mockDbUser);

    const middleware = requireRoles([Role.MANAGER]);

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);

    expect((req as Request).dbUser).toEqual(mockDbUser);
  });

  it('should call next() and attach dbUser if user has one of the allowed roles', async () => {
    req.user = {
      adUsername: 'test_worker',
      authMethod: 'mock',
    };

    const mockDbUser = makeUser({
      id: '33333333-3333-4333-8333-333333333333',
      fullName: 'Test Worker',
      militaryEmail: 'test_worker@idf.il',
      adUsername: 'test_worker',
      role: Role.WORKER,
    });

    jest.spyOn(AuthService.prototype, 'getOrCreateUser').mockResolvedValue(mockDbUser);

    const middleware = requireRoles([Role.MANAGER, Role.WORKER]);

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);

    expect((req as Request).dbUser).toEqual(mockDbUser);
  });
});
