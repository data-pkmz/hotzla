/*
  Warnings:

  - Added the required column `quantity` to the `cart_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Made the column `display_style` on table `product_attribute_definition` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "quantity" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "quantity" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "product_attribute_definition" ALTER COLUMN "display_style" SET NOT NULL;
