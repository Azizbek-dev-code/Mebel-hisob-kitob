-- Expense completeness: soft void + status for ledger integrity.

DO $$ BEGIN
  CREATE TYPE "ExpenseStatus" AS ENUM ('ACTIVE', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "status" "ExpenseStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

CREATE INDEX IF NOT EXISTS "expenses_storeId_status_idx" ON "expenses"("storeId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_cancelledById_fkey'
  ) THEN
    ALTER TABLE "expenses"
      ADD CONSTRAINT "expenses_cancelledById_fkey"
      FOREIGN KEY ("cancelledById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
