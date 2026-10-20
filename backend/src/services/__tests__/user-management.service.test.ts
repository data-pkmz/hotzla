import { Role } from '@prisma/client';

import { prisma } from '../../config/db';
import { UserManagementService, UserManagementError } from '../user-management.service';

jest.mock('../../config/db', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const managerId = '11111111-1111-4111-8111-111111111111';
const requesterId = '22222222-2222-4222-8222-222222222222';
const workerId = '33333333-3333-4333-8333-333333333333';
const targetManagerId = '44444444-4444-4444-8444-444444444444';

const requester = {
  id: requesterId,
  fullName: 'Test Requester',
  adUsername: 'test-requester',
  militaryEmail: 'requester@idf.il',
  unit: 'Unit A',
  role: Role.REQUESTER,
};

const worker = {
  id: workerId,
  fullName: 'Test Worker',
  adUsername: 'test-worker',
  militaryEmail: 'worker@idf.il',
  unit: 'Unit B',
  role: Role.WORKER,
};

const manager = {
  id: managerId,
  fullName: 'Test Manager',
  adUsername: 'test-manager',
  militaryEmail: 'manager@idf.il',
  unit: 'Unit C',
  role: Role.MANAGER,
};

const targetManager = {
  ...manager,
  id: targetManagerId,
  adUsername: 'another-manager',
};

const mockFindMany = prisma.user.findMany as jest.Mock;
const mockFindFirst = prisma.user.findFirst as jest.Mock;
const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockFindUniqueOrThrow = prisma.user.findUniqueOrThrow as jest.Mock;
const mockUpdateMany = prisma.user.updateMany as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

describe('UserManagementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Execute interactive transaction callbacks with the mocked Prisma client.
    mockTransaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma)
    );

    // By default, the acting user is an active manager.
    mockFindFirst.mockResolvedValue({ id: managerId });
  });

  describe('getUsers', () => {
    it('returns active users including managers', async () => {
      const users = [manager, requester, worker];

      mockFindMany.mockResolvedValue(users);

      const result = await UserManagementService.getUsers();

      expect(result).toEqual({ users });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
          fullName: true,
          adUsername: true,
          militaryEmail: true,
          unit: true,
          role: true,
        },
        orderBy: [{ fullName: 'asc' }, { adUsername: 'asc' }],
      });
    });

    it('returns an empty array when no active users exist', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await UserManagementService.getUsers();

      expect(result).toEqual({ users: [] });
    });

    it('propagates database errors', async () => {
      mockFindMany.mockRejectedValue(new Error('Database unavailable'));

      await expect(UserManagementService.getUsers()).rejects.toThrow('Database unavailable');
    });
  });

  describe('updateUserRole', () => {
    it('assigns the WORKER role to a REQUESTER', async () => {
      const updatedUser = {
        ...requester,
        role: Role.WORKER,
      };

      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindUniqueOrThrow.mockResolvedValue(updatedUser);

      const result = await UserManagementService.updateUserRole(requesterId, 'WORKER', managerId);

      expect(result).toEqual({
        user: updatedUser,
      });

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: managerId,
          role: Role.MANAGER,
          isDeleted: false,
        },
        select: {
          id: true,
        },
      });

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: {
          id: requesterId,
          isDeleted: false,
          role: {
            in: [Role.REQUESTER, Role.WORKER],
          },
        },
        data: {
          role: 'WORKER',
        },
      });

      expect(mockFindUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: requesterId },
        select: {
          id: true,
          fullName: true,
          adUsername: true,
          militaryEmail: true,
          unit: true,
          role: true,
        },
      });

      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('removes the WORKER role by changing it to REQUESTER', async () => {
      const updatedUser = {
        ...worker,
        role: Role.REQUESTER,
      };

      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindUniqueOrThrow.mockResolvedValue(updatedUser);

      const result = await UserManagementService.updateUserRole(workerId, 'REQUESTER', managerId);

      expect(result.user.role).toBe(Role.REQUESTER);

      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: workerId,
            role: {
              in: [Role.REQUESTER, Role.WORKER],
            },
          }),
          data: {
            role: 'REQUESTER',
          },
        })
      );
    });

    it.each([
      ['REQUESTER', Role.REQUESTER],
      ['WORKER', Role.WORKER],
    ] as const)('allows assigning the existing %s role', async (newRole, existingRole) => {
      const updatedUser = {
        ...requester,
        role: existingRole,
      };

      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindUniqueOrThrow.mockResolvedValue(updatedUser);

      const result = await UserManagementService.updateUserRole(requesterId, newRole, managerId);

      expect(result.user.role).toBe(existingRole);
    });

    it('rejects assigning the MANAGER role', async () => {
      await expect(
        UserManagementService.updateUserRole(requesterId, 'MANAGER' as never, managerId)
      ).rejects.toMatchObject({
        statusCode: 400,
      });

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it('rejects an unknown role at runtime', async () => {
      await expect(
        UserManagementService.updateUserRole(requesterId, 'ADMIN' as never, managerId)
      ).rejects.toBeInstanceOf(UserManagementError);

      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('rejects an invalid target user UUID', async () => {
      await expect(
        UserManagementService.updateUserRole('invalid-user-id', 'WORKER', managerId)
      ).rejects.toMatchObject({
        statusCode: 400,
      });

      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('rejects an invalid acting manager UUID', async () => {
      await expect(
        UserManagementService.updateUserRole(requesterId, 'WORKER', 'invalid-manager-id')
      ).rejects.toMatchObject({
        statusCode: 400,
      });

      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('rejects role changes when the actor is not a manager', async () => {
      mockFindFirst.mockResolvedValue(null);

      await expect(
        UserManagementService.updateUserRole(requesterId, 'WORKER', workerId)
      ).rejects.toMatchObject({
        statusCode: 403,
      });

      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it('rejects role changes from a deleted manager', async () => {
      // The database lookup does not return deleted managers.
      mockFindFirst.mockResolvedValue(null);

      await expect(
        UserManagementService.updateUserRole(requesterId, 'WORKER', managerId)
      ).rejects.toMatchObject({
        statusCode: 403,
      });

      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it('rejects modifying an existing MANAGER account', async () => {
      mockUpdateMany.mockResolvedValue({ count: 0 });

      mockFindUnique.mockResolvedValue({
        role: targetManager.role,
        isDeleted: false,
      });

      await expect(
        UserManagementService.updateUserRole(targetManagerId, 'WORKER', managerId)
      ).rejects.toMatchObject({
        statusCode: 403,
      });

      expect(mockFindUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('returns 404 for a nonexistent target user', async () => {
      mockUpdateMany.mockResolvedValue({ count: 0 });
      mockFindUnique.mockResolvedValue(null);

      await expect(
        UserManagementService.updateUserRole(requesterId, 'WORKER', managerId)
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('returns 404 for a soft-deleted target user', async () => {
      mockUpdateMany.mockResolvedValue({ count: 0 });

      mockFindUnique.mockResolvedValue({
        role: Role.REQUESTER,
        isDeleted: true,
      });

      await expect(
        UserManagementService.updateUserRole(requesterId, 'WORKER', managerId)
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('returns 409 if the conditional update fails unexpectedly', async () => {
      mockUpdateMany.mockResolvedValue({ count: 0 });

      mockFindUnique.mockResolvedValue({
        role: Role.REQUESTER,
        isDeleted: false,
      });

      await expect(
        UserManagementService.updateUserRole(requesterId, 'WORKER', managerId)
      ).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it('propagates database errors during role updates', async () => {
      mockUpdateMany.mockRejectedValue(new Error('Database update failed'));

      await expect(
        UserManagementService.updateUserRole(requesterId, 'WORKER', managerId)
      ).rejects.toThrow('Database update failed');
    });

    it('does not fetch the updated user when the update fails', async () => {
      mockUpdateMany.mockResolvedValue({ count: 0 });
      mockFindUnique.mockResolvedValue(null);

      await expect(
        UserManagementService.updateUserRole(requesterId, 'WORKER', managerId)
      ).rejects.toThrow();

      expect(mockFindUniqueOrThrow).not.toHaveBeenCalled();
    });
  });
});
