/// <reference types="jest" />

import { NotificationJobStatus, NotificationJobType } from '@prisma/client';

import { prisma } from '../../config/db';
import { NotificationService } from '../notification.service';

jest.mock('../../config/db', () => ({
  prisma: {
    notificationJob: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('NotificationService', () => {
  const orderId = '11111111-1111-4111-8111-111111111111';

  const baseOrder = {
    orderId,
    orderNumber: '2026-0001',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (prisma.notificationJob.create as jest.Mock).mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      orderId,
      type: NotificationJobType.READY_FOR_PICKUP,
      status: NotificationJobStatus.PENDING,
      payload: {},
      attempts: 0,
      lastError: null,
      createdAt: new Date(),
      processedAt: null,
    });
  });

  it('queues a ready-for-pickup notification for the requester', async () => {
    await NotificationService.notifyRequesterStatusChange({
      ...baseOrder,
      status: 'READY_FOR_PICKUP',
      requesterEmail: 'requester@example.com',
      trackingUrl: 'http://localhost:8080/my-orders',
    });

    expect(prisma.notificationJob.create).toHaveBeenCalledTimes(1);

    expect(prisma.notificationJob.create).toHaveBeenCalledWith({
      data: {
        order: {
          connect: {
            id: orderId,
          },
        },
        type: NotificationJobType.READY_FOR_PICKUP,
        status: NotificationJobStatus.PENDING,
        payload: {
          orderId,
          orderNumber: '2026-0001',
          requesterEmail: 'requester@example.com',
          trackingUrl: 'http://localhost:8080/my-orders',
          pickupInstructions: 'ניתן לאסוף את ההזמנה מבית הדפוס.',
        },
      },
    });
  });

  it('queues a budget approval notification for the budget officer', async () => {
    await NotificationService.notifyBudgetOfficer({
      ...baseOrder,
      requesterName: 'ישראל ישראלי',
      budgetOfficerEmail: 'budget@example.com',
      totalPrice: 100,
      approvalUrl: 'http://localhost:8080/orders/order-1',
      items: [],
    });

    expect(prisma.notificationJob.create).toHaveBeenCalledTimes(1);

    expect(prisma.notificationJob.create).toHaveBeenCalledWith({
      data: {
        order: {
          connect: {
            id: orderId,
          },
        },
        type: NotificationJobType.BUDGET_APPROVAL,
        status: NotificationJobStatus.PENDING,
        payload: {
          orderId,
          orderNumber: '2026-0001',
          requesterName: 'ישראל ישראלי',
          budgetOfficerEmail: 'budget@example.com',
          totalPrice: 100,
          approvalUrl: 'http://localhost:8080/orders/order-1',
          items: [],
        },
      },
    });
  });

  it('propagates an error if the notification job cannot be queued', async () => {
    (prisma.notificationJob.create as jest.Mock).mockRejectedValue(
      new Error('Failed to create notification job')
    );

    await expect(
      NotificationService.notifyBudgetOfficer({
        ...baseOrder,
        requesterName: 'ישראל ישראלי',
        budgetOfficerEmail: 'budget@example.com',
        totalPrice: 100,
        approvalUrl: 'http://localhost:8080/orders/order-1',
        items: [],
      })
    ).rejects.toThrow('Failed to create notification job');
  });
});
