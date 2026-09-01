-- Prevent duplicate operational / settle COMMISSION posts for the same reference.
CREATE UNIQUE INDEX IF NOT EXISTS "worker_financial_transactions_store_ref_commission_unique"
ON "worker_financial_transactions" ("storeId", "referenceType", "referenceId")
WHERE "type" = 'COMMISSION'
  AND "referenceType" IS NOT NULL
  AND "referenceId" IS NOT NULL;
