-- Allow re-post of the same operational/settle reference after a full REVERSAL
-- while still blocking duplicate open COMMISSION rows.
-- Also store which responsibility bucket a ledger row belongs to.

ALTER TABLE "worker_financial_transactions"
  ADD COLUMN IF NOT EXISTS "isOpen" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "worker_financial_transactions"
  ADD COLUMN IF NOT EXISTS "responsibility" "WorkerResponsibility";

-- Mark already-reversed COMMISSION rows as closed so the unique open-key can free up.
UPDATE "worker_financial_transactions" AS w
SET "isOpen" = false
FROM "worker_financial_transactions" AS r
WHERE w."type" = 'COMMISSION'
  AND w."isOpen" = true
  AND r."type" = 'REVERSAL'
  AND r."referenceType" = 'REVERSAL'
  AND r."referenceId" = w."id"
  AND r."storeId" = w."storeId";

-- REVERSAL / non-commission rows are never "open credits".
UPDATE "worker_financial_transactions"
SET "isOpen" = false
WHERE "type" <> 'COMMISSION' AND "isOpen" = true;

DROP INDEX IF EXISTS "worker_financial_transactions_store_ref_commission_unique";

CREATE UNIQUE INDEX "worker_financial_transactions_store_ref_commission_open_unique"
ON "worker_financial_transactions" ("storeId", "referenceType", "referenceId")
WHERE "type" = 'COMMISSION'
  AND "isOpen" = true
  AND "referenceType" IS NOT NULL
  AND "referenceId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "worker_financial_transactions_store_worker_responsibility_idx"
ON "worker_financial_transactions" ("storeId", "workerId", "responsibility");
