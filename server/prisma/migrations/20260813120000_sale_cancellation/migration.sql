-- Phase 8 / sales lifecycle: controlled sale cancellation (void), not hard delete.
-- Adds cancel metadata + SALE_CANCELLED activity type.

ALTER TYPE "WorkerActivityType" ADD VALUE IF NOT EXISTS 'SALE_CANCELLED';

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_cancelledById_fkey'
  ) THEN
    ALTER TABLE "sales"
      ADD CONSTRAINT "sales_cancelledById_fkey"
      FOREIGN KEY ("cancelledById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "sales_storeId_cancelledAt_idx" ON "sales"("storeId", "cancelledAt");
