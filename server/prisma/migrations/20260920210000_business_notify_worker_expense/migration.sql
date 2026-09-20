-- Additive: business notification prefs/reads on store users, and a unique
-- worker-payment link on expenses so cash PAYMENT posts once as opex.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bizNotifyPrefs" JSONB;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bizNotifyReads" JSONB;

ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "workerPaymentId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "expenses_workerPaymentId_key"
  ON "expenses"("workerPaymentId");
