/*
  Warnings:

  - The legacy values BUDGET_APPROVED, IN_PRINTING, and REJECTED are mapped to their corresponding replacement statuses.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING_BUDGET', 'PENDING_MANAGER_APPROVAL', 'APPROVED_FOR_PRODUCTION', 'IN_PRODUCTION', 'READY_FOR_PICKUP', 'COMPLETED', 'REJECTED_BUDGET', 'REJECTED_MANAGER', 'CANCELLED');
ALTER TABLE "order_status_history"
  ALTER COLUMN "from_status" TYPE "OrderStatus_new"
  USING (
    CASE "from_status"::text
      WHEN 'BUDGET_APPROVED' THEN 'PENDING_MANAGER_APPROVAL'
      WHEN 'IN_PRINTING' THEN 'IN_PRODUCTION'
      WHEN 'REJECTED' THEN 'REJECTED_MANAGER'
      ELSE "from_status"::text
    END
  )::"OrderStatus_new";
ALTER TABLE "order_status_history"
  ALTER COLUMN "to_status" TYPE "OrderStatus_new"
  USING (
    CASE "to_status"::text
      WHEN 'BUDGET_APPROVED' THEN 'PENDING_MANAGER_APPROVAL'
      WHEN 'IN_PRINTING' THEN 'IN_PRODUCTION'
      WHEN 'REJECTED' THEN 'REJECTED_MANAGER'
      ELSE "to_status"::text
    END
  )::"OrderStatus_new";
ALTER TABLE "orders"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING (
    CASE "status"::text
      WHEN 'BUDGET_APPROVED' THEN 'PENDING_MANAGER_APPROVAL'
      WHEN 'IN_PRINTING' THEN 'IN_PRODUCTION'
      WHEN 'REJECTED' THEN 'REJECTED_MANAGER'
      ELSE "status"::text
    END
  )::"OrderStatus_new";
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
COMMIT;
