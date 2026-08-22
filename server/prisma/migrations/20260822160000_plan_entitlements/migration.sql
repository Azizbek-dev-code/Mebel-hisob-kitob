-- Feature / limit registry, subscription history, and subscription requests.
-- Existing store_subscriptions rows stay; the unique storeId constraint becomes
-- a partial unique index so only the current row is unique per store.

DO $$ BEGIN
  CREATE TYPE "SubscriptionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "trialDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isDefaultTrial" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "subscription_plans_isDefaultTrial_idx" ON "subscription_plans"("isDefaultTrial");

CREATE TABLE IF NOT EXISTS "features" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "features_key_key" ON "features"("key");
CREATE INDEX IF NOT EXISTS "features_isActive_sortOrder_idx" ON "features"("isActive", "sortOrder");

CREATE TABLE IF NOT EXISTS "plan_features" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "featureId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "plan_features_planId_featureId_key" ON "plan_features"("planId", "featureId");
CREATE INDEX IF NOT EXISTS "plan_features_featureId_idx" ON "plan_features"("featureId");

ALTER TABLE "plan_features"
  DROP CONSTRAINT IF EXISTS "plan_features_planId_fkey";
ALTER TABLE "plan_features"
  ADD CONSTRAINT "plan_features_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plan_features"
  DROP CONSTRAINT IF EXISTS "plan_features_featureId_fkey";
ALTER TABLE "plan_features"
  ADD CONSTRAINT "plan_features_featureId_fkey"
  FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "plan_limits" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "resourceKey" TEXT NOT NULL,
  "limitValue" INTEGER,
  "unlimited" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "plan_limits_planId_resourceKey_key" ON "plan_limits"("planId", "resourceKey");
CREATE INDEX IF NOT EXISTS "plan_limits_resourceKey_idx" ON "plan_limits"("resourceKey");

ALTER TABLE "plan_limits"
  DROP CONSTRAINT IF EXISTS "plan_limits_planId_fkey";
ALTER TABLE "plan_limits"
  ADD CONSTRAINT "plan_limits_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_subscriptions"
  ADD COLUMN IF NOT EXISTS "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);

ALTER TABLE "store_subscriptions"
  DROP CONSTRAINT IF EXISTS "store_subscriptions_storeId_key";

DROP INDEX IF EXISTS "store_subscriptions_storeId_key";

CREATE INDEX IF NOT EXISTS "store_subscriptions_storeId_isCurrent_idx"
  ON "store_subscriptions"("storeId", "isCurrent");

CREATE UNIQUE INDEX IF NOT EXISTS "store_subscriptions_one_current"
  ON "store_subscriptions"("storeId")
  WHERE "isCurrent" = true;

CREATE TABLE IF NOT EXISTS "subscription_requests" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "requestedPriceSnapshot" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UZS',
  "status" "SubscriptionRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "note" TEXT,
  "createdInvoiceId" TEXT,
  "createdSubscriptionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscription_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "subscription_requests_status_requestedAt_idx"
  ON "subscription_requests"("status", "requestedAt");
CREATE INDEX IF NOT EXISTS "subscription_requests_storeId_status_idx"
  ON "subscription_requests"("storeId", "status");
CREATE INDEX IF NOT EXISTS "subscription_requests_planId_idx"
  ON "subscription_requests"("planId");

ALTER TABLE "subscription_requests"
  DROP CONSTRAINT IF EXISTS "subscription_requests_storeId_fkey";
ALTER TABLE "subscription_requests"
  ADD CONSTRAINT "subscription_requests_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscription_requests"
  DROP CONSTRAINT IF EXISTS "subscription_requests_planId_fkey";
ALTER TABLE "subscription_requests"
  ADD CONSTRAINT "subscription_requests_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscription_requests"
  DROP CONSTRAINT IF EXISTS "subscription_requests_reviewedById_fkey";
ALTER TABLE "subscription_requests"
  ADD CONSTRAINT "subscription_requests_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
