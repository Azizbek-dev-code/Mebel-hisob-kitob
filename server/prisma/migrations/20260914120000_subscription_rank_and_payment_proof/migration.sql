-- Rank + audience on existing tariffs, payment proof on requests, optional
-- workspaceId so Personal and Business share SubscriptionRequest.
-- Does not rewrite old migrations. Does not touch ERP Sale/Payment tables.

DO $$ BEGIN
  CREATE TYPE "PlanAudience" AS ENUM ('STORE', 'PERSONAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "rank" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "audience" "PlanAudience" NOT NULL DEFAULT 'STORE';

CREATE INDEX IF NOT EXISTS "subscription_plans_audience_rank_idx"
  ON "subscription_plans" ("audience", "rank");

UPDATE "subscription_plans" SET "rank" = 0 WHERE "isDefaultTrial" = true;
UPDATE "subscription_plans" SET "rank" = 1 WHERE name = 'START';
UPDATE "subscription_plans" SET "rank" = 2 WHERE name = 'PRO';
UPDATE "subscription_plans" SET "rank" = 3 WHERE name = 'BUSINESS';

INSERT INTO "subscription_plans" (
  "id",
  "name",
  "description",
  "monthlyPrice",
  "currency",
  "trialDays",
  "isActive",
  "isDefaultTrial",
  "features",
  "rank",
  "audience",
  "createdAt",
  "updatedAt"
)
SELECT
  'cmlkpersonalpaid01xxxxxxxx',
  'PERSONAL_PAID',
  'Shaxsiy moliya pullik tarif',
  49000,
  'UZS',
  0,
  true,
  false,
  '{}',
  1,
  'PERSONAL',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "subscription_plans" WHERE name = 'PERSONAL_PAID'
);

ALTER TABLE "subscription_requests"
  ALTER COLUMN "storeId" DROP NOT NULL;

ALTER TABLE "subscription_requests"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

ALTER TABLE "subscription_requests"
  ADD COLUMN IF NOT EXISTS "paymentMethod" "PlatformPaymentMethod";

ALTER TABLE "subscription_requests"
  ADD COLUMN IF NOT EXISTS "payerReference" TEXT;

ALTER TABLE "subscription_requests"
  ADD COLUMN IF NOT EXISTS "proofUrl" TEXT;

ALTER TABLE "subscription_requests"
  ADD COLUMN IF NOT EXISTS "proofKey" TEXT;

DO $$ BEGIN
  ALTER TABLE "subscription_requests"
    ADD CONSTRAINT "subscription_requests_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "subscription_requests"
    ADD CONSTRAINT "subscription_requests_account_xor"
    CHECK (
      ("storeId" IS NOT NULL AND "workspaceId" IS NULL)
      OR ("storeId" IS NULL AND "workspaceId" IS NOT NULL)
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS "subscription_requests_one_pending_per_store";

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_requests_one_pending_per_store"
  ON "subscription_requests" ("storeId")
  WHERE "status" = 'PENDING' AND "storeId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_requests_one_pending_per_workspace"
  ON "subscription_requests" ("workspaceId")
  WHERE "status" = 'PENDING' AND "workspaceId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "subscription_requests_workspaceId_status_idx"
  ON "subscription_requests" ("workspaceId", "status");

ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "paymentCardNumber" TEXT NOT NULL DEFAULT '';

ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "paymentAccountNumber" TEXT NOT NULL DEFAULT '';

ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "paymentInstructions" TEXT NOT NULL DEFAULT '';
