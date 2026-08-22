-- SaaS trial + payment-request fields. Extends existing billing models.

ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';

ALTER TYPE "PlatformBillingStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "store_subscriptions"
  ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trialWelcomeSeenAt" TIMESTAMP(3);

ALTER TABLE "platform_invoices"
  ADD COLUMN IF NOT EXISTS "durationMonths" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "requestedById" TEXT;

CREATE INDEX IF NOT EXISTS "platform_invoices_requestedById_idx" ON "platform_invoices"("requestedById");

ALTER TABLE "platform_invoices"
  DROP CONSTRAINT IF EXISTS "platform_invoices_requestedById_fkey";

ALTER TABLE "platform_invoices"
  ADD CONSTRAINT "platform_invoices_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
