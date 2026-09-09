-- Add the new workflow statuses while preserving the legacy values for the
-- resettable test database.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_MANAGER_APPROVAL';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_PRODUCTION';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REJECTED_BUDGET';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REJECTED_MANAGER';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
