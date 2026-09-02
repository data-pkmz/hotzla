/*
  Warnings:

  - The values [BUDGET_APPROVED,IN_PRINTING,REJECTED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING_BUDGET', 'PENDING_MANAGER_APPROVAL', 'APPROVED_FOR_PRODUCTION', 'IN_PRODUCTION', 'READY_FOR_PICKUP', 'COMPLETED', 'REJECTED_BUDGET', 'REJECTED_MANAGER', 'CANCELLED');
ALTER TABLE "order_status_history" ALTER COLUMN "from_status" TYPE "OrderStatus_new" USING ("from_status"::text::"OrderStatus_new");
ALTER TABLE "order_status_history" ALTER COLUMN "to_status" TYPE "OrderStatus_new" USING ("to_status"::text::"OrderStatus_new");
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
COMMIT;
