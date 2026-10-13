-- CreateEnum
CREATE TYPE "NotificationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationJobType" AS ENUM ('ORDER_CONFIRMATION', 'BUDGET_APPROVAL', 'BUDGET_DECISION_CONFIRMATION', 'READY_FOR_PICKUP');

-- CreateTable
CREATE TABLE "notification_jobs" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "type" "NotificationJobType" NOT NULL,
    "status" "NotificationJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "notification_jobs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
