-- DropForeignKey
ALTER TABLE "order_item_attribute_values" DROP CONSTRAINT "order_item_attribute_values_selected_option_id_fkey";

-- AlterTable
ALTER TABLE "order_item_attribute_values" ALTER COLUMN "selected_option_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "order_item_attribute_values" ADD CONSTRAINT "order_item_attribute_values_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "product_attribute_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
