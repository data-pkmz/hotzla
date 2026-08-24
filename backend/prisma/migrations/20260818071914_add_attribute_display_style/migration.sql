-- CreateEnum
CREATE TYPE "AttributeDisplayStyle" AS ENUM ('DROPDOWN', 'CARDS', 'NUMBER_INPUT', 'CHECKBOX', 'SWITCH', 'SINGLE_LINE', 'MULTI_LINE', 'FILE_DROPZONE');

-- AlterTable
ALTER TABLE "product_attribute_definition" ADD COLUMN     "display_style" "AttributeDisplayStyle";
