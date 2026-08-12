/*
  Warnings:

  - Changed the type of `status` on the `orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `product_id` on table `product_attribute_definition` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_approved_by_manager_id_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_worker_id_fkey";

-- DropForeignKey
ALTER TABLE "product_attribute_definition" DROP CONSTRAINT "product_attribute_definition_product_id_fkey";

-- AlterTable
ALTER TABLE "approval_tokens" ALTER COLUMN "used_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL,
ALTER COLUMN "approved_by_manager_id" DROP NOT NULL,
ALTER COLUMN "approved_by_manager_at" DROP NOT NULL,
ALTER COLUMN "worker_id" DROP NOT NULL,
ALTER COLUMN "completed_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "product_attribute_definition" ALTER COLUMN "product_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "product_attribute_options" ADD COLUMN     "is_per_unit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "product_attribute_definition" ADD CONSTRAINT "product_attribute_definition_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_approved_by_manager_id_fkey" FOREIGN KEY ("approved_by_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
