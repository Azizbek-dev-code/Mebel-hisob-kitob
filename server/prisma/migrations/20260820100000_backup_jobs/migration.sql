-- Backup catalogue: one row per administrator-triggered export of a store.
-- The compressed artefact itself lives on disk under BACKUP_DIR/<storeId>/<id>.json.gz;
-- this table only records what was taken, by whom, and whether it succeeded.

CREATE TYPE "BackupJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "BackupFormat" AS ENUM ('LOGICAL_JSON', 'PG_CUSTOM');

CREATE TABLE "backup_jobs" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdById" TEXT,
    "status" "BackupJobStatus" NOT NULL DEFAULT 'PENDING',
    "format" "BackupFormat" NOT NULL DEFAULT 'LOGICAL_JSON',
    "filename" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "checksumSha256" TEXT,
    "errorMessage" TEXT,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "backup_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "backup_jobs_storeId_createdAt_idx" ON "backup_jobs"("storeId", "createdAt");
CREATE INDEX "backup_jobs_storeId_status_idx" ON "backup_jobs"("storeId", "status");

ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
