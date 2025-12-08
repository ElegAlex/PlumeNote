-- CreateTable
CREATE TABLE "note_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "content" TEXT NOT NULL,
    "icon" VARCHAR(50),
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "is_built_in" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "note_templates_category_idx" ON "note_templates"("category");

-- CreateIndex
CREATE INDEX "note_templates_is_public_idx" ON "note_templates"("is_public");

-- CreateIndex
CREATE INDEX "note_templates_created_by_id_idx" ON "note_templates"("created_by_id");

-- AddForeignKey
ALTER TABLE "note_templates" ADD CONSTRAINT "note_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
