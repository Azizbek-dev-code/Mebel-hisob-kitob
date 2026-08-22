-- Phase 8 Step 1: worker financial transaction ledger foundation
-- Applied via `prisma db push` during development; this SQL documents the delta
-- for environments that use `prisma migrate deploy`.

DO $$ BEGIN
  CREATE TYPE "WorkerFinancialTransactionType" AS ENUM (
    'BONUS',
    'COMMISSION',
    'ADVANCE',
    'DEBT',
    'PAYMENT',
    'ADJUSTMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkerFinancialReferenceType" AS ENUM (
    'MANUAL',
    'SALE',
    'ASSEMBLY',
    'PAYROLL'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "worker_financial_transactions" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "type" "WorkerFinancialTransactionType" NOT NULL,
  "amount" BIGINT NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "referenceType" "WorkerFinancialReferenceType",
  "referenceId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "worker_financial_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "worker_financial_transactions_storeId_workerId_transactionDate_idx"
  ON "worker_financial_transactions"("storeId", "workerId", "transactionDate");

CREATE INDEX IF NOT EXISTS "worker_financial_transactions_storeId_transactionDate_idx"
  ON "worker_financial_transactions"("storeId", "transactionDate");

CREATE INDEX IF NOT EXISTS "worker_financial_transactions_storeId_type_idx"
  ON "worker_financial_transactions"("storeId", "type");

CREATE INDEX IF NOT EXISTS "worker_financial_transactions_storeId_referenceType_referenceId_idx"
  ON "worker_financial_transactions"("storeId", "referenceType", "referenceId");

DO $$ BEGIN
  ALTER TABLE "worker_financial_transactions"
    ADD CONSTRAINT "worker_financial_transactions_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "worker_financial_transactions"
    ADD CONSTRAINT "worker_financial_transactions_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "worker_financial_transactions"
    ADD CONSTRAINT "worker_financial_transactions_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
