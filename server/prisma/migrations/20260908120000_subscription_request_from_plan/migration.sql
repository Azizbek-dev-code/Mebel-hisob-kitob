-- Snapshot the store's current plan onto each subscription-change request so
-- history still shows "from START → PRO" after Accept rewrites the live sub.
-- One PENDING request per store: two clicks must not mint two invoices later.

ALTER TABLE "subscription_requests"
  ADD COLUMN IF NOT EXISTS "fromPlanId" TEXT,
  ADD COLUMN IF NOT EXISTS "fromPlanName" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_requests_one_pending_per_store"
  ON "subscription_requests" ("storeId")
  WHERE "status" = 'PENDING';
