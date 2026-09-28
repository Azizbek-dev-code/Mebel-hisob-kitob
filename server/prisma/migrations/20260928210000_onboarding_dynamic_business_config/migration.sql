-- Additive: dynamic per-business-type onboarding config.
-- - Option descriptions for admin-editable business type cards
-- - Extra answer types (TEXTAREA, NUMBER, BOOLEAN)
-- - Scope legacy shared BUSINESS questions to FURNITURE
-- - Hide non-launch business type options until admin enables them

-- AlterEnum
ALTER TYPE "OnboardingAnswerType" ADD VALUE IF NOT EXISTS 'TEXTAREA';
ALTER TYPE "OnboardingAnswerType" ADD VALUE IF NOT EXISTS 'NUMBER';
ALTER TYPE "OnboardingAnswerType" ADD VALUE IF NOT EXISTS 'BOOLEAN';

-- AlterTable
ALTER TABLE "onboarding_options"
  ADD COLUMN IF NOT EXISTS "descriptionUz" TEXT,
  ADD COLUMN IF NOT EXISTS "descriptionRu" TEXT;

-- Scope furniture-era shared BUSINESS questions to FURNITURE so they do not
-- appear for SMM (and future verticals) until admin reassigns them.
UPDATE "onboarding_questions"
SET "businessType" = 'FURNITURE'
WHERE "audience" = 'BUSINESS'
  AND "businessType" IS NULL
  AND "key" IN (
    'businessSize',
    'staffCount',
    'monthlyTurnover',
    'currentBookkeeping',
    'businessBiggestProblem',
    'platformNeed'
  );

-- Launch verticals for onboarding: FURNITURE + SMM. Admin can re-enable others.
UPDATE "onboarding_options" AS o
SET "isActive" = false
FROM "onboarding_questions" AS q
WHERE o."questionId" = q.id
  AND q."key" = 'businessType'
  AND o."key" IN ('CARPET', 'CLOTHING', 'ELECTRONICS', 'OTHER');
