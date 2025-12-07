-- CreateEnum
CREATE TYPE "FolderAccessType" AS ENUM ('OPEN', 'RESTRICTED');

-- AlterTable
ALTER TABLE "folders" ADD COLUMN     "access_type" "FolderAccessType" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "folder_access" (
    "id" UUID NOT NULL,
    "folder_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "can_read" BOOLEAN NOT NULL DEFAULT true,
    "can_write" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folder_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "folder_access_user_id_idx" ON "folder_access"("user_id");

-- CreateIndex
CREATE INDEX "folder_access_folder_id_idx" ON "folder_access"("folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "folder_access_folder_id_user_id_key" ON "folder_access"("folder_id", "user_id");

-- CreateIndex
CREATE INDEX "folders_access_type_idx" ON "folders"("access_type");

-- AddForeignKey
ALTER TABLE "folder_access" ADD CONSTRAINT "folder_access_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder_access" ADD CONSTRAINT "folder_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
