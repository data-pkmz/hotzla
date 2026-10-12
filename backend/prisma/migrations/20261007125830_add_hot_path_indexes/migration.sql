-- CreateIndex
CREATE INDEX "cart_items_cart_id_is_deleted_idx" ON "cart_items"("cart_id", "is_deleted");

-- CreateIndex
CREATE INDEX "carts_user_id_status_is_deleted_idx" ON "carts"("user_id", "status", "is_deleted");

-- CreateIndex
CREATE INDEX "product_attribute_definition_product_id_is_deleted_idx" ON "product_attribute_definition"("product_id", "is_deleted");

-- CreateIndex
CREATE INDEX "product_attribute_options_attribute_definition_id_is_delete_idx" ON "product_attribute_options"("attribute_definition_id", "is_deleted");
