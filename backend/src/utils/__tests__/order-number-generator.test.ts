/// <reference types="jest" />
import { OrderNumberGenerator, type DbClient } from '../order-number-generator.js';

describe('OrderNumberGenerator', () => {
  it('should generate 2026-0001 when no previous orders exist for the year', async () => {
    const mockDb = {
      order: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as unknown as DbClient;

    const orderNumber = await OrderNumberGenerator.generateNextOrderNumber(mockDb, 2026);

    expect(orderNumber).toBe('2026-0001');
    expect(mockDb.order.findFirst).toHaveBeenCalledWith({
      where: {
        orderNumber: {
          startsWith: '2026-',
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
      select: {
        orderNumber: true,
      },
    });
  });

  it('should increment the sequence from previous order', async () => {
    const mockDb = {
      order: {
        findFirst: jest.fn().mockResolvedValue({ orderNumber: '2026-0007' }),
      },
    } as unknown as DbClient;

    const orderNumber = await OrderNumberGenerator.generateNextOrderNumber(mockDb, 2026);

    expect(orderNumber).toBe('2026-0008');
  });

  it('should reset sequence to 0001 when starting a new year', async () => {
    const mockDb = {
      order: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as unknown as DbClient;

    const orderNumber = await OrderNumberGenerator.generateNextOrderNumber(mockDb, 2027);

    expect(orderNumber).toBe('2027-0001');
    expect(mockDb.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          orderNumber: {
            startsWith: '2027-',
          },
        },
      })
    );
  });

  it('should handle large numbers beyond 9999 gracefully', async () => {
    const mockDb = {
      order: {
        findFirst: jest.fn().mockResolvedValue({ orderNumber: '2026-9999' }),
      },
    } as unknown as DbClient;

    const orderNumber = await OrderNumberGenerator.generateNextOrderNumber(mockDb, 2026);

    expect(orderNumber).toBe('2026-10000');
  });

  it('should fallback to 0001 if existing orderNumber is malformed', async () => {
    const mockDb = {
      order: {
        findFirst: jest.fn().mockResolvedValue({ orderNumber: '2026-INVALID' }),
      },
    } as unknown as DbClient;

    const orderNumber = await OrderNumberGenerator.generateNextOrderNumber(mockDb, 2026);

    expect(orderNumber).toBe('2026-0001');
  });
});
