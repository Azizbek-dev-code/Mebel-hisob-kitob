-- Phase 8 Step 2: worker financial ledger management (REVERSAL + reversesType)
-- Applied via `prisma db push` during development; this SQL documents the delta
-- for environments that use `prisma migrate deploy`.

DO $$ BEGIN
  ALTER TYPE "WorkerFinancialTransactionType" ADD VALUE IF NOT EXISTS 'REVERSAL';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "WorkerFinancialReferenceType" ADD VALUE IF NOT EXISTS 'REVERSAL';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "worker_financial_transactions"
  ADD COLUMN IF NOT EXISTS "reversesType" "WorkerFinancialTransactionType";

CREATE INDEX IF NOT EXISTS "worker_financial_transactions_storeId_type_reversesType_idx"
  ON "worker_financial_transactions"("storeId", "type", "reversesType");

-- At most one REVERSAL row may point at a given original transaction.
CREATE UNIQUE INDEX IF NOT EXISTS "worker_financial_transactions_store_reversal_original_uidx"
  ON "worker_financial_transactions"("storeId", "referenceId")
  WHERE "type" = 'REVERSAL' AND "referenceType" = 'REVERSAL' AND "referenceId" IS NOT NULL;
