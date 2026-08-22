-- Phase 5: sales fulfilment fields + assembly tasks
-- Applied via `prisma db push` during development; this SQL documents the delta
-- for environments that use `prisma migrate deploy`.

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'OTHER';
ALTER TYPE "FulfilmentStatus" ADD VALUE IF NOT EXISTS 'IN_TRANSIT';

DO $$ BEGIN
  CREATE TYPE "AssemblyTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "sales"
  ADD COLUMN IF NOT EXISTS "deliveryPersonId" TEXT,
  ADD COLUMN IF NOT EXISTS "assemblyStatus" "AssemblyTaskStatus",
  ADD COLUMN IF NOT EXISTS "installationNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryNotes" TEXT;

CREATE TABLE IF NOT EXISTS "assembly_tasks" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "assigneeId" TEXT NOT NULL,
  "assignedById" TEXT,
  "completedById" TEXT,
  "status" "AssemblyTaskStatus" NOT NULL DEFAULT 'PENDING',
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deadline" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assembly_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sales_storeId_assemblyStatus_idx" ON "sales"("storeId", "assemblyStatus");
CREATE INDEX IF NOT EXISTS "sales_storeId_deliveryStatus_idx" ON "sales"("storeId", "deliveryStatus");
CREATE INDEX IF NOT EXISTS "sales_storeId_installationStatus_idx" ON "sales"("storeId", "installationStatus");
CREATE INDEX IF NOT EXISTS "assembly_tasks_storeId_assigneeId_status_idx" ON "assembly_tasks"("storeId", "assigneeId", "status");
CREATE INDEX IF NOT EXISTS "assembly_tasks_storeId_saleId_idx" ON "assembly_tasks"("storeId", "saleId");
CREATE INDEX IF NOT EXISTS "assembly_tasks_storeId_status_idx" ON "assembly_tasks"("storeId", "status");
