-- AlterTable
ALTER TABLE "products" ADD COLUMN     "max_quantity" INTEGER,
ADD COLUMN     "min_quantity" INTEGER NOT NULL DEFAULT 1;
