-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'EXTRACTING', 'PARSING', 'CREATING', 'RESOLVING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConflictStrategy" AS ENUM ('RENAME', 'SKIP', 'OVERWRITE');

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "file_name" VARCHAR(255) NOT NULL,
    "target_folder_id" UUID,
    "conflict_strategy" "ConflictStrategy" NOT NULL DEFAULT 'RENAME',
    "temp_file_path" VARCHAR(500),
    "total_files" INTEGER NOT NULL DEFAULT 0,
    "processed_files" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "warning_count" INTEGER NOT NULL DEFAULT 0,
    "results" JSONB,
    "errors" JSONB,
    "preview" JSONB,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_jobs_user_id_status_idx" ON "import_jobs"("user_id", "status");

-- CreateIndex
CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");

-- CreateIndex
CREATE INDEX "import_jobs_created_at_idx" ON "import_jobs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_target_folder_id_fkey" FOREIGN KEY ("target_folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
