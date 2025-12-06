-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_folder_id_fkey";

-- AlterTable
ALTER TABLE "folders" ADD COLUMN     "is_personal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "owner_id" UUID;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "is_personal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "owner_id" UUID,
ALTER COLUMN "folder_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "folders_owner_id_is_personal_idx" ON "folders"("owner_id", "is_personal");

-- CreateIndex
CREATE INDEX "folders_is_personal_idx" ON "folders"("is_personal");

-- CreateIndex
CREATE INDEX "notes_owner_id_is_personal_idx" ON "notes"("owner_id", "is_personal");

-- CreateIndex
CREATE INDEX "notes_is_personal_idx" ON "notes"("is_personal");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Contraintes CHECK pour garantir l'intégrité des notes personnelles
-- Si isPersonal=true, ownerId doit être défini
ALTER TABLE "notes" ADD CONSTRAINT "notes_personal_owner_check"
    CHECK (("is_personal" = false) OR ("is_personal" = true AND "owner_id" IS NOT NULL));

ALTER TABLE "folders" ADD CONSTRAINT "folders_personal_owner_check"
    CHECK (("is_personal" = false) OR ("is_personal" = true AND "owner_id" IS NOT NULL));
