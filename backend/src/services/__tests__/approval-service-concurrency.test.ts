import { prisma } from '../../config/db';
import { ApprovalService } from '../approval.service';
import { TokenService } from '../token.service';
import { OrderStatus, ChangeSource } from '@prisma/client';

describe('ApprovalService - Integration & Concurrency Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    // 1. Setup: Create a temporary user for our tests
    const user = await prisma.user.create({
      data: {
        adUsername: `test_concurrency_${Date.now()}`,
        fullName: 'Test Concurrency User',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // 2. Teardown: Clean up the database to leave no traces
    await prisma.approvalToken.deleteMany({
      where: { order: { requesterId: testUserId } },
    });
    await prisma.orderStatusHistory.deleteMany({
      where: { orders: { requesterId: testUserId } },
    });
    await prisma.order.deleteMany({
      where: { requesterId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  // Helper function to generate a fresh order for each test
  const createTestOrder = async (status: OrderStatus = OrderStatus.PENDING_BUDGET) => {
    return prisma.order.create({
      data: {
        orderNumber: `TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        requesterId: testUserId,
        status,
        unit: 'Test Unit',
        budgetOfficerName: 'Test Officer',
        budgetOfficerEmail: 'test@example.com',
        totalPrice: 100,
      },
    });
  };

  describe('State Machine (Transitions)', () => {
    it('should allow valid transitions (Happy Path)', async () => {
      // Start at PENDING_BUDGET
      const order = await createTestOrder(OrderStatus.PENDING_BUDGET);

      // PENDING_BUDGET -> PENDING_MANAGER_APPROVAL
      let updatedOrder = await ApprovalService.transitionOrderStatus({
        orderId: order.id,
        toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
        changedBySource: ChangeSource.SYSTEM,
      });
      expect(updatedOrder.status).toBe(OrderStatus.PENDING_MANAGER_APPROVAL);

      // PENDING_MANAGER_APPROVAL -> APPROVED_FOR_PRODUCTION
      updatedOrder = await ApprovalService.transitionOrderStatus({
        orderId: order.id,
        toStatus: OrderStatus.APPROVED_FOR_PRODUCTION,
        changedBySource: ChangeSource.SYSTEM,
      });
      expect(updatedOrder.status).toBe(OrderStatus.APPROVED_FOR_PRODUCTION);

      // APPROVED_FOR_PRODUCTION -> IN_PRODUCTION
      updatedOrder = await ApprovalService.transitionOrderStatus({
        orderId: order.id,
        toStatus: OrderStatus.IN_PRODUCTION,
        changedBySource: ChangeSource.SYSTEM,
      });
      expect(updatedOrder.status).toBe(OrderStatus.IN_PRODUCTION);
    });

    it('should reject invalid jumps (e.g., PENDING_BUDGET to COMPLETED)', async () => {
      const order = await createTestOrder(OrderStatus.PENDING_BUDGET);

      await expect(
        ApprovalService.transitionOrderStatus({
          orderId: order.id,
          toStatus: OrderStatus.COMPLETED,
          changedBySource: ChangeSource.SYSTEM,
        })
      ).rejects.toThrow(/Invalid order status transition/);
    });

    it('should reject transitions from terminal states (e.g., CANCELLED to PENDING_MANAGER_APPROVAL)', async () => {
      const order = await createTestOrder(OrderStatus.CANCELLED);

      await expect(
        ApprovalService.transitionOrderStatus({
          orderId: order.id,
          toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
          changedBySource: ChangeSource.SYSTEM,
        })
      ).rejects.toThrow(/Invalid order status transition/);
    });

    it('should reject transitions from REJECTED_BUDGET to IN_PRODUCTION', async () => {
      const order = await createTestOrder(OrderStatus.REJECTED_BUDGET);

      await expect(
        ApprovalService.transitionOrderStatus({
          orderId: order.id,
          toStatus: OrderStatus.IN_PRODUCTION,
          changedBySource: ChangeSource.SYSTEM,
        })
      ).rejects.toThrow(/Invalid order status transition/);
    });
  });

  describe('Concurrency & Security', () => {
    it('should handle Race Conditions securely via Row Locking (Double Click)', async () => {
      const order = await createTestOrder(OrderStatus.PENDING_BUDGET);

      // We simulate a race condition: 2 requests fired perfectly in parallel for the exact same order.
      const promise1 = ApprovalService.transitionOrderStatus({
        orderId: order.id,
        toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
        changedBySource: ChangeSource.SYSTEM,
      });

      const promise2 = ApprovalService.transitionOrderStatus({
        orderId: order.id,
        toStatus: OrderStatus.PENDING_MANAGER_APPROVAL,
        changedBySource: ChangeSource.SYSTEM,
      });

      // Execute them concurrently
      const results = await Promise.allSettled([promise1, promise2]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // ONLY ONE request should succeed. The database lock must block the second one
      // until the first one completes, at which point the status has changed and the second fails.
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      if (rejected[0].status === 'rejected') {
        // The rejected request must fail with a state transition error
        expect(rejected[0].reason.message).toMatch(/Invalid order status transition/);
      }
    });

    it('should block the reuse of an already consumed Approval Token', async () => {
      const order = await createTestOrder(OrderStatus.PENDING_BUDGET);
      const token = await TokenService.generateApprovalToken(order.id);

      // First use: The officer clicks "Approve" (SUCCESS)
      const result1 = await TokenService.validateAndUseToken(token, 'APPROVE');
      expect(result1.status).toBe(OrderStatus.PENDING_MANAGER_APPROVAL);

      // Second use: The officer accidentally clicks "Approve" again a second later (FAIL)
      await expect(TokenService.validateAndUseToken(token, 'APPROVE')).rejects.toThrow(
        /already been used/i
      );
    });
  });
});
