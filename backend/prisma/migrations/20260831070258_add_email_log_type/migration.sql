/*
  Warnings:

  - The values [MATCHED,IGNORED] on the enum `ProcessedStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `type` to the `email_log` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('BUDGET_APPROVAL', 'ORDER_CONFIRMATION', 'READY_FOR_PICKUP', 'INBOUND_REPLY', 'INBOUND_OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "ProcessedStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ERROR');
ALTER TABLE "email_log" ALTER COLUMN "processed_status" TYPE "ProcessedStatus_new" USING ("processed_status"::text::"ProcessedStatus_new");
ALTER TYPE "ProcessedStatus" RENAME TO "ProcessedStatus_old";
ALTER TYPE "ProcessedStatus_new" RENAME TO "ProcessedStatus";
DROP TYPE "public"."ProcessedStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "email_log" DROP CONSTRAINT "email_log_order_id_fkey";

-- AlterTable
ALTER TABLE "email_log" ADD COLUMN     "type" "EmailType" NOT NULL,
ALTER COLUMN "order_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
