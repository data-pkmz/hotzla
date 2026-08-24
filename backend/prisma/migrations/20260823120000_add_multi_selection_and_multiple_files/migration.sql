ALTER TYPE "SelectionMode" ADD VALUE 'MULTI';

ALTER TABLE "product_attribute_definition"
ADD COLUMN "allow_multiple_files" BOOLEAN NOT NULL DEFAULT false;