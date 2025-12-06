-- CreateEnum
CREATE TYPE "MetadataType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'CHECKBOX', 'URL', 'EMAIL');

-- CreateTable
CREATE TABLE "note_metadata" (
    "id" TEXT NOT NULL,
    "note_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "type" "MetadataType" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "note_metadata_note_id_idx" ON "note_metadata"("note_id");

-- CreateIndex
CREATE INDEX "note_metadata_key_idx" ON "note_metadata"("key");

-- CreateIndex
CREATE UNIQUE INDEX "note_metadata_note_id_key_key" ON "note_metadata"("note_id", "key");

-- AddForeignKey
ALTER TABLE "note_metadata" ADD CONSTRAINT "note_metadata_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
