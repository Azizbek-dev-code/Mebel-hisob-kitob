-- Additive: Personal registration email proof + profile age/growth interests.
-- Does not rewrite existing onboarding answers or deactivate catalog rows
-- (catalog sync runs in ensureOnboardingCatalog application code).

ALTER TABLE "onboarding_submissions"
  ADD COLUMN IF NOT EXISTS "registerEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "onboarding_submissions_registerEmail_idx"
  ON "onboarding_submissions"("registerEmail");

ALTER TABLE "personal_profiles"
  ADD COLUMN IF NOT EXISTS "age" INTEGER,
  ADD COLUMN IF NOT EXISTS "growthInterests" JSONB NOT NULL DEFAULT '[]';
