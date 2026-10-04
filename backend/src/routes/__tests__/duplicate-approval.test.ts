import request from 'supertest';
import { OrderStatus, Role, ChangeSource } from '@prisma/client';

import app from '../../app';
import { prisma } from '../../config/db';
import { TokenService } from '../../services/token.service';

describe('Duplicate Approval - Full Integration Test', () => {
  const timestamp = Date.now();

  const requesterUsername = `duplicate_requester_${timestamp}`;
  const managerOneUsername = `duplicate_manager_1_${timestamp}`;
  const managerTwoUsername = `duplicate_manager_2_${timestamp}`;

  let requesterId: string;
  let managerOneId: string;
  let managerTwoId: string;

  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    process.env.AUTH_MODE = 'mock';

    const requester = await prisma.user.create({
      data: {
        adUsername: requesterUsername,
        fullName: 'Duplicate Approval Requester',
        militaryEmail: 'duplicate-requester@example.com',
        role: Role.REQUESTER,
      },
    });

    const managerOne = await prisma.user.create({
      data: {
        adUsername: managerOneUsername,
        fullName: 'Duplicate Approval Manager One',
        militaryEmail: 'duplicate-manager-one@example.com',
        role: Role.MANAGER,
      },
    });

    const managerTwo = await prisma.user.create({
      data: {
        adUsername: managerTwoUsername,
        fullName: 'Duplicate Approval Manager Two',
        militaryEmail: 'duplicate-manager-two@example.com',
        role: Role.MANAGER,
      },
    });

    requesterId = requester.id;
    managerOneId = managerOne.id;
    managerTwoId = managerTwo.id;
  });

  afterAll(async () => {
    if (createdOrderIds.length > 0) {
      await prisma.approvalToken.deleteMany({
        where: {
          orderId: {
            in: createdOrderIds,
          },
        },
      });

      await prisma.orderStatusHistory.deleteMany({
        where: {
          orderId: {
            in: createdOrderIds,
          },
        },
      });

      await prisma.order.deleteMany({
        where: {
          id: {
            in: createdOrderIds,
          },
        },
      });
    }

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [requesterId, managerOneId, managerTwoId],
        },
      },
    });
  });

  const createTestOrder = async () => {
    const order = await prisma.order.create({
      data: {
        orderNumber: `DUP-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        requesterId,
        status: OrderStatus.PENDING_BUDGET,
        unit: 'Integration Test Unit',
        budgetOfficerName: 'Integration Budget Officer',
        budgetOfficerEmail: 'budget-officer@example.com',
        totalPrice: 100,
      },
    });

    createdOrderIds.push(order.id);

    return order;
  };

  it('accepts only one manager approval when two browsers approve concurrently', async () => {
    // ============================================================
    // ARRANGE
    // ============================================================

    const order = await createTestOrder();

    /*
     * Stage 1:
     * Budget Officer approves the order.
     *
     * This represents the first approval in the double-approval
     * workflow:
     *
     * PENDING_BUDGET -> PENDING_MANAGER_APPROVAL
     */
    const approvalToken = await TokenService.generateApprovalToken(order.id);

    const budgetApprovalResult = await TokenService.validateAndUseToken(approvalToken, 'APPROVE');

    expect(budgetApprovalResult.status).toBe(OrderStatus.PENDING_MANAGER_APPROVAL);

    /*
     * Verify the database before starting the race.
     */
    const afterBudgetApproval = await prisma.order.findUniqueOrThrow({
      where: {
        id: order.id,
      },
    });

    expect(afterBudgetApproval.status).toBe(OrderStatus.PENDING_MANAGER_APPROVAL);

    // ============================================================
    // ACT
    // ============================================================

    /*
     * Each agent represents an independent browser/session.
     *
     * We deliberately use two different manager accounts as well.
     * This makes it possible to verify exactly which manager won
     * the race.
     */
    const browserOne = request.agent(app);
    const browserTwo = request.agent(app);

    /*
     * IMPORTANT:
     * Do not await either request individually.
     *
     * Creating both promises first and awaiting Promise.all()
     * causes both HTTP requests to be active concurrently.
     */
    const managerOneRequest = browserOne
      .post(`/api/orders/${order.id}/manager-approve`)
      .set('X-Mock-User', managerOneUsername);

    const managerTwoRequest = browserTwo
      .post(`/api/orders/${order.id}/manager-approve`)
      .set('X-Mock-User', managerTwoUsername);

    const responses = await Promise.all([managerOneRequest, managerTwoRequest]);

    // ============================================================
    // ASSERT - HTTP results
    // ============================================================

    const successfulResponses = responses.filter(
      (response) => response.status >= 200 && response.status < 300
    );

    const failedResponses = responses.filter((response) => response.status >= 400);

    /*
     * PostgreSQL row locking in ApprovalService should guarantee:
     *
     * Request A:
     * PENDING_MANAGER_APPROVAL -> APPROVED_FOR_PRODUCTION
     *
     * Request B:
     * waits for A's transaction
     * reads APPROVED_FOR_PRODUCTION
     * attempts the same transition
     * transition is rejected
     */
    expect(successfulResponses).toHaveLength(1);
    expect(failedResponses).toHaveLength(1);

    // ============================================================
    // ASSERT - final database state
    // ============================================================

    const finalOrder = await prisma.order.findUniqueOrThrow({
      where: {
        id: order.id,
      },
    });

    expect(finalOrder.status).toBe(OrderStatus.APPROVED_FOR_PRODUCTION);

    /*
     * Exactly one of the managers must own the approval.
     */
    expect([managerOneId, managerTwoId]).toContain(finalOrder.approvedByManagerId);

    // ============================================================
    // ASSERT - status history
    // ============================================================

    const statusHistory = await prisma.orderStatusHistory.findMany({
      where: {
        orderId: order.id,
      },
      orderBy: {
        changedAt: 'asc',
      },
    });

    /*
     * One and only one Budget Officer transition should exist.
     */
    const budgetApprovalEntries = statusHistory.filter(
      (entry) =>
        entry.fromStatus === OrderStatus.PENDING_BUDGET &&
        entry.toStatus === OrderStatus.PENDING_MANAGER_APPROVAL &&
        entry.changedBySource === ChangeSource.EMAIL_BUDGET_OFFICER
    );

    expect(budgetApprovalEntries).toHaveLength(1);

    /*
     * More importantly, there must only be ONE manager transition,
     * even though two HTTP requests were received.
     */
    const managerApprovalEntries = statusHistory.filter(
      (entry) =>
        entry.fromStatus === OrderStatus.PENDING_MANAGER_APPROVAL &&
        entry.toStatus === OrderStatus.APPROVED_FOR_PRODUCTION &&
        entry.changedBySource === ChangeSource.MANAGER_UI
    );

    expect(managerApprovalEntries).toHaveLength(1);

    /*
     * The history's manager must also agree with the Order record.
     */
    expect(managerApprovalEntries[0].changedByUserId).toBe(finalOrder.approvedByManagerId);
  });
});
