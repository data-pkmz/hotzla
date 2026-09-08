/// <reference types="jest" />
import { NotificationService } from '../notification.service';
import { EmailService } from '../email.service';

jest.mock('../email.service', () => ({
  EmailService: {
    sendManagerNewOrder: jest.fn(),
    sendOrderConfirmation: jest.fn(),
    sendReadyForPickup: jest.fn(),
    sendBudgetApproval: jest.fn(),
    sendBudgetDecisionConfirmation: jest.fn(),
  },
}));

describe('NotificationService', () => {
  // Reuse one stable order identity across tests so assertions focus on
  // notification routing rather than unrelated fixture differences.
  const baseOrder = {
    orderId: 'order-1',
    orderNumber: '2026-0001',
  };

  beforeEach(() => {
    // Reset mocks and environment configuration between tests to prevent one
    // notification scenario from affecting the next one.
    jest.clearAllMocks();
    delete process.env.MANAGER_EMAIL;
  });

  it('routes a new-order notification to the configured manager email', async () => {
    // The manager recipient is resolved by NotificationService from the
    // environment rather than being supplied by the order workflow.
    process.env.MANAGER_EMAIL = 'manager@example.com';

    await NotificationService.notifyManagerNewOrder({
      ...baseOrder,
      requesterName: 'ישראל ישראלי',
      totalPrice: 100,
      orderUrl: 'http://localhost:8080/orders/order-1',
      items: [],
    });

    expect(EmailService.sendManagerNewOrder).toHaveBeenCalledWith({
      ...baseOrder,
      requesterName: 'ישראל ישראלי',
      totalPrice: 100,
      orderUrl: 'http://localhost:8080/orders/order-1',
      items: [],
      managerEmail: 'manager@example.com',
    });
  });

  it('does not send a manager notification when the recipient is not configured', async () => {
    // Missing configuration must not result in an attempt to send to an
    // undefined mailbox.
    await NotificationService.notifyManagerNewOrder({
      ...baseOrder,
      requesterName: 'ישראל ישראלי',
      totalPrice: 100,
      orderUrl: 'http://localhost:8080/orders/order-1',
      items: [],
    });

    expect(EmailService.sendManagerNewOrder).not.toHaveBeenCalled();
  });

  it('routes ready-for-pickup status changes to the requester', async () => {
    // This verifies the status-to-template mapping used after a successful
    // order status transition.
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
    // A budget approval payload must be delegated to the approval-request
    // template rather than the decision-confirmation template.
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
