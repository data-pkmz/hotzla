-- CreateEnum
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'MANAGER', 'WORKER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "military_email" TEXT NOT NULL,
    "ad_username" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'REQUESTER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_ad_username_key" ON "users"("ad_username");
