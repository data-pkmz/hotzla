import { ChangeSource, OrderStatus } from '@prisma/client';

import { prisma } from '../../config/db';
import { ApprovalService } from '../approval.service';
import { AuditLogService } from '../audit-log.service';

jest.mock('../../config/db', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock('../audit-log.service', () => ({
  AuditLogService: {
    logStatusChange: jest.fn(),
  },
}));

describe('ApprovalService', () => {
  const mockTx = {
    $queryRaw: jest.fn(),
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
        return callback(mockTx);
      }
    );

    mockTx.$queryRaw.mockResolvedValue([{ id: 'order-1' }]);

    mockTx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PENDING_BUDGET,
      isDeleted: false,
    });

    mockTx.order.update.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PENDING_MANAGER_APPROVAL,
      isDeleted: false,
    });

    (AuditLogService.logStatusChange as jest.Mock).mockResolvedValue({
      id: 'history-1',
    });
  });

  describe('transitionOrderStatus', () => {
    it('should transition an order when the transition is allowed', async () => {
      const result = await ApprovalService.transitionOrderStatus({
        orderId: 'order-1',
        toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
        changedByUserId: null,
        changedBySource: ChangeSource.EMAIL_BUDGET_OFFICER,
        note: 'Budget approval received',
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);

      expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);

      expect(mockTx.order.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'order-1',
        },
      });

      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: {
          id: 'order-1',
        },
        data: {
          status: OrderStatus.PENDING_MANAGER_APPROVAL,
        },
      });

      expect(AuditLogService.logStatusChange).toHaveBeenCalledWith(
        {
          orderId: 'order-1',
          fromStatus: OrderStatus.PENDING_BUDGET,
          toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
          changedByUserId: null,
          changedBySource: ChangeSource.EMAIL_BUDGET_OFFICER,
          note: 'Budget approval received',
        },
        mockTx
      );

      expect(result).toEqual({
        id: 'order-1',
        status: OrderStatus.PENDING_MANAGER_APPROVAL,
        isDeleted: false,
      });
    });

    it('should allow rejection by the budget officer', async () => {
      mockTx.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.REJECTED_BUDGET,
        isDeleted: false,
      });

      await ApprovalService.transitionOrderStatus({
        orderId: 'order-1',
        toStatus: OrderStatus.REJECTED_BUDGET,
        changedByUserId: null,
        changedBySource: ChangeSource.EMAIL_BUDGET_OFFICER,
      });

      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: {
          id: 'order-1',
        },
        data: {
          status: OrderStatus.REJECTED_BUDGET,
        },
      });

      expect(AuditLogService.logStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          fromStatus: OrderStatus.PENDING_BUDGET,
          toStatus: OrderStatus.REJECTED_BUDGET,
        }),
        mockTx
      );
    });

    it('should reject an invalid status transition', async () => {
      await expect(
        ApprovalService.transitionOrderStatus({
          orderId: 'order-1',
          toStatus: OrderStatus.COMPLETED,
          changedBySource: ChangeSource.SYSTEM,
        })
      ).rejects.toThrow('Invalid order status transition: PENDING_BUDGET -> COMPLETED');

      expect(mockTx.order.update).not.toHaveBeenCalled();
      expect(AuditLogService.logStatusChange).not.toHaveBeenCalled();
    });

    it('should reject transitions from a terminal status', async () => {
      mockTx.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.COMPLETED,
        isDeleted: false,
      });

      await expect(
        ApprovalService.transitionOrderStatus({
          orderId: 'order-1',
          toStatus: OrderStatus.IN_PRODUCTION,
          changedBySource: ChangeSource.SYSTEM,
        })
      ).rejects.toThrow('Invalid order status transition: COMPLETED -> IN_PRODUCTION');

      expect(mockTx.order.update).not.toHaveBeenCalled();
      expect(AuditLogService.logStatusChange).not.toHaveBeenCalled();
    });

    it('should throw when orderId is missing', async () => {
      await expect(
        ApprovalService.transitionOrderStatus({
          orderId: '',
          toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
          changedBySource: ChangeSource.SYSTEM,
        })
      ).rejects.toThrow('Order ID is required');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw when the order cannot be locked because it does not exist', async () => {
      mockTx.$queryRaw.mockResolvedValue([]);

      await expect(
        ApprovalService.transitionOrderStatus({
          orderId: 'missing-order',
          toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
          changedBySource: ChangeSource.SYSTEM,
        })
      ).rejects.toThrow('Order not found');

      expect(mockTx.order.findUnique).not.toHaveBeenCalled();
      expect(mockTx.order.update).not.toHaveBeenCalled();
      expect(AuditLogService.logStatusChange).not.toHaveBeenCalled();
    });

    it('should throw when the order is not found after acquiring the lock', async () => {
      mockTx.order.findUnique.mockResolvedValue(null);

      await expect(
        ApprovalService.transitionOrderStatus({
          orderId: 'order-1',
          toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
          changedBySource: ChangeSource.SYSTEM,
        })
      ).rejects.toThrow('Order not found');

      expect(mockTx.order.update).not.toHaveBeenCalled();
      expect(AuditLogService.logStatusChange).not.toHaveBeenCalled();
    });

    it('should throw when the order is deleted', async () => {
      mockTx.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PENDING_BUDGET,
        isDeleted: true,
      });

      await expect(
        ApprovalService.transitionOrderStatus({
          orderId: 'order-1',
          toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
          changedBySource: ChangeSource.SYSTEM,
        })
      ).rejects.toThrow('Order not found');

      expect(mockTx.order.update).not.toHaveBeenCalled();
      expect(AuditLogService.logStatusChange).not.toHaveBeenCalled();
    });

    it('should not write audit history if the order update fails', async () => {
      mockTx.order.update.mockRejectedValue(new Error('Database update failed'));

      await expect(
        ApprovalService.transitionOrderStatus({
          orderId: 'order-1',
          toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
          changedBySource: ChangeSource.SYSTEM,
        })
      ).rejects.toThrow('Database update failed');

      expect(AuditLogService.logStatusChange).not.toHaveBeenCalled();
    });

    it('should fail the transaction if audit logging fails', async () => {
      (AuditLogService.logStatusChange as jest.Mock).mockRejectedValue(
        new Error('Audit logging failed')
      );

      await expect(
        ApprovalService.transitionOrderStatus({
          orderId: 'order-1',
          toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
          changedBySource: ChangeSource.SYSTEM,
        })
      ).rejects.toThrow('Audit logging failed');

      expect(mockTx.order.update).toHaveBeenCalledTimes(1);
      expect(AuditLogService.logStatusChange).toHaveBeenCalledTimes(1);
    });

    it('should use default null values for optional audit fields', async () => {
      await ApprovalService.transitionOrderStatus({
        orderId: 'order-1',
        toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
        changedBySource: ChangeSource.SYSTEM,
      });

      expect(AuditLogService.logStatusChange).toHaveBeenCalledWith(
        {
          orderId: 'order-1',
          fromStatus: OrderStatus.PENDING_BUDGET,
          toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
          changedByUserId: null,
          changedBySource: ChangeSource.SYSTEM,
          note: null,
        },
        mockTx
      );
    });
  });
});
