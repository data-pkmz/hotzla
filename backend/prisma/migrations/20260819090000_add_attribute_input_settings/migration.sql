CREATE TYPE "SelectionMode" AS ENUM ('DROPDOWN', 'FLAT');
CREATE TYPE "FileTypeMode" AS ENUM ('IMAGE', 'PDF', 'IMAGE_AND_PDF');

ALTER TABLE "product_attribute_definition"
  ADD COLUMN "selection_mode" "SelectionMode",
  ADD COLUMN "max_length" INTEGER,
  ADD COLUMN "allowed_file_types" "FileTypeMode";