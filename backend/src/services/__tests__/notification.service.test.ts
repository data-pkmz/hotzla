/// <reference types="jest" />
import { NotificationService } from '../notification.service';
import { EmailService } from '../email.service';

jest.mock('../email.service', () => ({
  EmailService: {
    sendOrderConfirmation: jest.fn(),
    sendReadyForPickup: jest.fn(),
    sendBudgetApproval: jest.fn(),
    sendBudgetDecisionConfirmation: jest.fn(),
  },
}));

describe('NotificationService', () => {
  const baseOrder = {
    orderId: 'order-1',
    orderNumber: '2026-0001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes ready-for-pickup status changes to the requester', async () => {
    await NotificationService.notifyRequesterStatusChange({
      ...baseOrder,
      status: 'READY_FOR_PICKUP',
      requesterEmail: 'requester@example.com',
      trackingUrl: 'http://localhost:8080/my-orders',
    });

    expect(EmailService.sendReadyForPickup).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        requesterEmail: 'requester@example.com',
      })
    );
  });

  it('routes budget approval requests to the budget officer', async () => {
    await NotificationService.notifyBudgetOfficer({
      ...baseOrder,
      requesterName: 'ישראל ישראלי',
      budgetOfficerEmail: 'budget@example.com',
      totalPrice: 100,
      approvalUrl: 'http://localhost:8080/orders/order-1',
      items: [],
    });

    expect(EmailService.sendBudgetApproval).toHaveBeenCalled();
  });
});
