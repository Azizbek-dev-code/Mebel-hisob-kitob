-- Welcome modal dismiss timestamp. Personal billing only — no storeId.

ALTER TABLE "personal_subscriptions"
  ADD COLUMN IF NOT EXISTS "trialWelcomeSeenAt" TIMESTAMP(3);
