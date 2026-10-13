/// <reference types="jest" />

import { OrderNumberGenerator, type DbClient } from '../order-number-generator';

describe('OrderNumberGenerator', () => {
  /**
   * Creates a minimal mocked Prisma client containing only the
   * $queryRaw method used by OrderNumberGenerator.
   */
  const createMockDb = (lastValue: number) => {
    return {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          lastValue,
        },
      ]),
    } as unknown as DbClient;
  };

  it('should generate 2026-0001 for the first order of the year', async () => {
    const mockDb = createMockDb(1);

    const orderNumber = await OrderNumberGenerator.generateNextOrderNumber(mockDb, 2026);

    expect(orderNumber).toBe('2026-0001');

    expect(mockDb.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('should generate the next sequence returned by the database counter', async () => {
    const mockDb = createMockDb(8);

    const orderNumber = await OrderNumberGenerator.generateNextOrderNumber(mockDb, 2026);

    expect(orderNumber).toBe('2026-0008');

    expect(mockDb.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('should start a new year at 0001 when the database creates a new counter', async () => {
    const mockDb = createMockDb(1);

    const orderNumber = await OrderNumberGenerator.generateNextOrderNumber(mockDb, 2027);

    expect(orderNumber).toBe('2027-0001');

    expect(mockDb.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('should handle sequence numbers larger than 9999', async () => {
    const mockDb = createMockDb(10000);

    const orderNumber = await OrderNumberGenerator.generateNextOrderNumber(mockDb, 2026);

    expect(orderNumber).toBe('2026-10000');
  });

  it('should pass the requested year to the atomic database query', async () => {
    const mockDb = createMockDb(15);

    await OrderNumberGenerator.generateNextOrderNumber(mockDb, 2026);

    const queryCall = (mockDb.$queryRaw as jest.Mock).mock.calls[0];

    expect(queryCall[1]).toBe(2026);
  });

  it('should throw if the database does not return a counter value', async () => {
    const mockDb = {
      $queryRaw: jest.fn().mockResolvedValue([]),
    } as unknown as DbClient;

    await expect(OrderNumberGenerator.generateNextOrderNumber(mockDb, 2026)).rejects.toThrow(
      'Failed to generate the next order number'
    );
  });

  it('should propagate database errors', async () => {
    const mockDb = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('Database error')),
    } as unknown as DbClient;

    await expect(OrderNumberGenerator.generateNextOrderNumber(mockDb, 2026)).rejects.toThrow(
      'Database error'
    );
  });
});
