-- Phase 8 Step 4A: worker compensation rules foundation (configuration only).
-- Applied via `prisma db push` during development; this SQL documents the delta
-- for environments that use `prisma migrate deploy`.

DO $$ BEGIN
  CREATE TYPE "WorkerCompensationType" AS ENUM (
    'PERCENT_OF_SALE',
    'PERCENT_OF_GROSS_PROFIT',
    'FIXED_PER_SALE',
    'FIXED_PER_ASSEMBLY',
    'FIXED_PER_DELIVERY',
    'FIXED_PER_INSTALLATION'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "worker_compensation_rules" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "responsibility" "WorkerResponsibility" NOT NULL,
  "type" "WorkerCompensationType" NOT NULL,
  "value" BIGINT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "worker_compensation_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "worker_compensation_rules_storeId_workerId_responsibility_type_idx"
  ON "worker_compensation_rules"("storeId", "workerId", "responsibility", "type");

CREATE INDEX IF NOT EXISTS "worker_compensation_rules_storeId_workerId_isActive_idx"
  ON "worker_compensation_rules"("storeId", "workerId", "isActive");

CREATE INDEX IF NOT EXISTS "worker_compensation_rules_storeId_effectiveFrom_effectiveTo_idx"
  ON "worker_compensation_rules"("storeId", "effectiveFrom", "effectiveTo");

DO $$ BEGIN
  ALTER TABLE "worker_compensation_rules"
    ADD CONSTRAINT "worker_compensation_rules_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "worker_compensation_rules"
    ADD CONSTRAINT "worker_compensation_rules_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "worker_compensation_rules"
    ADD CONSTRAINT "worker_compensation_rules_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
