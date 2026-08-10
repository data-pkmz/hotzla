-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_BUDGET', 'BUDGET_APPROVED', 'APPROVED_FOR_PRODUCTION', 'IN_PRINTING', 'READY_FOR_PICKUP', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ChangeSource" AS ENUM ('SYSTEM', 'EMAIL_BUDGET_OFFICER', 'MANAGER_UI', 'WORKER_UI');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('FIXED', 'DYNAMIC');

-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('SELECT', 'NUMBER', 'BOOLEAN', 'TEXT', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "PricingRule" AS ENUM ('NONE', 'PER_UNIT_MULTIPLIER', 'FLAT_ADD_PER_OPTION');

-- CreateEnum
CREATE TYPE "PriceModifierType" AS ENUM ('FIXED_ADD', 'MULTIPLY');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "ProcessedStatus" AS ENUM ('PENDING', 'MATCHED', 'IGNORED', 'ERROR');

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "changed_by_user_id" UUID,
    "changed_by_source" "ChangeSource" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "product_type" "ProductType" NOT NULL,
    "base_price" DECIMAL(65,30) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_definition" (
    "id" UUID NOT NULL,
    "product_id" UUID,
    "attribute_name" TEXT NOT NULL,
    "attribute_type" "AttributeType" NOT NULL,
    "is_required" BOOLEAN NOT NULL,
    "display_order" INTEGER NOT NULL,
    "pricing_rule" "PricingRule" NOT NULL,
    "unit_price" DECIMAL(65,30),
    "min_value" DECIMAL(65,30),
    "max_value" DECIMAL(65,30),

    CONSTRAINT "product_attribute_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_options" (
    "id" UUID NOT NULL,
    "attribute_definition_id" UUID NOT NULL,
    "option_label" TEXT NOT NULL,
    "option_value" TEXT NOT NULL,
    "price_modifier" DECIMAL(65,30) NOT NULL,
    "price_modifier_type" "PriceModifierType" NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "product_attribute_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "Status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "uploaded_file_path" TEXT NOT NULL,
    "computed_price" DECIMAL(65,30) NOT NULL,
    "selected_attributes" JSONB NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "requester_id" UUID NOT NULL,
    "unit" TEXT NOT NULL,
    "status" "Status" NOT NULL,
    "budget_officer_name" TEXT NOT NULL,
    "budget_officer_email" TEXT NOT NULL,
    "total_price" DECIMAL(65,30) NOT NULL,
    "approved_by_manager_id" UUID NOT NULL,
    "approved_by_manager_at" TIMESTAMP(3) NOT NULL,
    "worker_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "uploaded_file_path" TEXT NOT NULL,
    "computed_unit_price" DECIMAL(65,30) NOT NULL,
    "computed_total_price" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_attribute_values" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "attribute_definition_id" UUID NOT NULL,
    "selected_option_id" UUID NOT NULL,
    "value_text" TEXT NOT NULL,

    CONSTRAINT "order_item_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_log" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "direction" "Direction" NOT NULL,
    "to_address" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "processed_status" "ProcessedStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_tokens" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "is_used" BOOLEAN NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "approval_tokens_token_key" ON "approval_tokens"("token");

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_definition" ADD CONSTRAINT "product_attribute_definition_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_options" ADD CONSTRAINT "product_attribute_options_attribute_definition_id_fkey" FOREIGN KEY ("attribute_definition_id") REFERENCES "product_attribute_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_approved_by_manager_id_fkey" FOREIGN KEY ("approved_by_manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_attribute_values" ADD CONSTRAINT "order_item_attribute_values_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_attribute_values" ADD CONSTRAINT "order_item_attribute_values_attribute_definition_id_fkey" FOREIGN KEY ("attribute_definition_id") REFERENCES "product_attribute_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_attribute_values" ADD CONSTRAINT "order_item_attribute_values_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "product_attribute_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_tokens" ADD CONSTRAINT "approval_tokens_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
