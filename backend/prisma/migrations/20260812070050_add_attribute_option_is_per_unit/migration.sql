-- AlterTable
ALTER TABLE "product_attribute_options" ADD COLUMN     "is_per_unit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;
