-- Sale-specific manual worker pay (Ish haqlari).
-- MANUAL rows override RULE compensation for the same sale event bucket.

DO $$ BEGIN
  CREATE TYPE "SaleWorkerPayRole" AS ENUM (
    'SELLER',
    'ASSEMBLER',
    'DASTAFCHI',
    'SHOPIR'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SaleWorkerPaySource" AS ENUM (
    'MANUAL',
    'RULE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "sale_worker_compensations" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "role" "SaleWorkerPayRole" NOT NULL,
  "source" "SaleWorkerPaySource" NOT NULL DEFAULT 'MANUAL',
  "amount" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sale_worker_compensations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sale_worker_compensations_saleId_role_key"
  ON "sale_worker_compensations"("saleId", "role");

CREATE INDEX IF NOT EXISTS "sale_worker_compensations_storeId_saleId_idx"
  ON "sale_worker_compensations"("storeId", "saleId");

CREATE INDEX IF NOT EXISTS "sale_worker_compensations_storeId_workerId_idx"
  ON "sale_worker_compensations"("storeId", "workerId");

DO $$ BEGIN
  ALTER TABLE "sale_worker_compensations"
    ADD CONSTRAINT "sale_worker_compensations_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "sale_worker_compensations"
    ADD CONSTRAINT "sale_worker_compensations_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "sale_worker_compensations"
    ADD CONSTRAINT "sale_worker_compensations_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
