import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { requireRoles } from '../rbac.middleware';
import { AuthService } from '../../services/auth.service';
import logger from '../../utils/logger';

// Mock AuthService and logger
jest.mock('../../services/auth.service');
jest.mock('../../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

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
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const middleware = requireRoles([Role.MANAGER]);

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: User not authenticated' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if user is deactivated', async () => {
    req.user = { adUsername: 'test_user', authMethod: 'mock' };

    const mockGetOrCreateUser = jest.fn().mockResolvedValue({ isDeleted: true });
    (AuthService as jest.Mock).mockImplementation(() => ({
      getOrCreateUser: mockGetOrCreateUser,
    }));

    const middleware = requireRoles([Role.MANAGER]);

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: User deactivated' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 Forbidden if user does not have the required role', async () => {
    req.user = { adUsername: 'test_user', authMethod: 'mock' };

    // User is a REQUESTER
    const mockGetOrCreateUser = jest.fn().mockResolvedValue({
      adUsername: 'test_user',
      role: Role.REQUESTER,
      isDeleted: false,
    });
    (AuthService as jest.Mock).mockImplementation(() => ({
      getOrCreateUser: mockGetOrCreateUser,
    }));

    // Route requires MANAGER or WORKER
    const middleware = requireRoles([Role.MANAGER, Role.WORKER]);

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Insufficient permissions' });
    expect(logger.warn).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() and attach dbUser if user has the exact required role', async () => {
    req.user = { adUsername: 'test_manager', authMethod: 'mock' };

    const mockDbUser = {
      adUsername: 'test_manager',
      role: Role.MANAGER,
      isDeleted: false,
    };
    const mockGetOrCreateUser = jest.fn().mockResolvedValue(mockDbUser);
    (AuthService as jest.Mock).mockImplementation(() => ({
      getOrCreateUser: mockGetOrCreateUser,
    }));

    // Route requires MANAGER
    const middleware = requireRoles([Role.MANAGER]);

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as Request).dbUser).toEqual(mockDbUser);
  });

  it('should call next() and attach dbUser if user has one of the allowed roles', async () => {
    req.user = { adUsername: 'test_worker', authMethod: 'mock' };

    const mockDbUser = {
      adUsername: 'test_worker',
      role: Role.WORKER,
      isDeleted: false,
    };
    const mockGetOrCreateUser = jest.fn().mockResolvedValue(mockDbUser);
    (AuthService as jest.Mock).mockImplementation(() => ({
      getOrCreateUser: mockGetOrCreateUser,
    }));

    // Route requires MANAGER or WORKER
    const middleware = requireRoles([Role.MANAGER, Role.WORKER]);

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as Request).dbUser).toEqual(mockDbUser);
  });
});
