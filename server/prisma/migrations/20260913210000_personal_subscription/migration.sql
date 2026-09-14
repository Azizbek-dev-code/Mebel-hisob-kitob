-- Personal Finance subscription. No storeId.

CREATE TABLE IF NOT EXISTS "personal_subscriptions" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "planKey" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "trialStartedAt" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "personal_subscriptions_workspaceId_key"
  ON "personal_subscriptions"("workspaceId");
CREATE INDEX IF NOT EXISTS "personal_subscriptions_status_currentPeriodEnd_idx"
  ON "personal_subscriptions"("status", "currentPeriodEnd");

ALTER TABLE "personal_subscriptions" DROP CONSTRAINT IF EXISTS "personal_subscriptions_workspaceId_fkey";
ALTER TABLE "personal_subscriptions"
  ADD CONSTRAINT "personal_subscriptions_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
