-- Planned monthly set-aside for personal saving goals. No storeId.

ALTER TABLE "personal_saving_goals"
  ADD COLUMN IF NOT EXISTS "monthlyContributionSom" BIGINT;
