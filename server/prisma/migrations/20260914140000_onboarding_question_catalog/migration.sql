-- Dynamic onboarding catalogue. Answers stay on OnboardingSubmission (no second capture table).
-- Does not rewrite old migrations. Does not touch ERP Sale/Payment/PersonalEntry tables.

DO $$ BEGIN
  CREATE TYPE "OnboardingAudience" AS ENUM ('PERSONAL', 'BUSINESS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OnboardingAnswerType" AS ENUM ('SINGLE', 'MULTI', 'TEXT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "onboarding_questions" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "audience" "OnboardingAudience" NOT NULL,
  "businessType" "BusinessType",
  "promptUz" TEXT NOT NULL,
  "promptRu" TEXT NOT NULL,
  "hintUz" TEXT,
  "hintRu" TEXT,
  "answerType" "OnboardingAnswerType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "onboarding_questions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_questions_key_key"
  ON "onboarding_questions"("key");

CREATE INDEX IF NOT EXISTS "onboarding_questions_audience_isActive_sortOrder_idx"
  ON "onboarding_questions"("audience", "isActive", "sortOrder");

CREATE TABLE IF NOT EXISTS "onboarding_options" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "labelUz" TEXT NOT NULL,
  "labelRu" TEXT NOT NULL,
  "allowsOther" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "onboarding_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_options_questionId_key_key"
  ON "onboarding_options"("questionId", "key");

CREATE INDEX IF NOT EXISTS "onboarding_options_questionId_sortOrder_idx"
  ON "onboarding_options"("questionId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "onboarding_options"
    ADD CONSTRAINT "onboarding_options_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "onboarding_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "onboarding_needs" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "labelUz" TEXT NOT NULL,
  "labelRu" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "onboarding_needs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_needs_key_key"
  ON "onboarding_needs"("key");

CREATE TABLE IF NOT EXISTS "onboarding_solutions" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "labelUz" TEXT NOT NULL,
  "labelRu" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "onboarding_solutions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_solutions_key_key"
  ON "onboarding_solutions"("key");

CREATE TABLE IF NOT EXISTS "onboarding_need_mappings" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "optionKey" TEXT NOT NULL,
  "needId" TEXT NOT NULL,
  "solutionId" TEXT NOT NULL,
  CONSTRAINT "onboarding_need_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_need_mappings_questionId_optionKey_needId_solutionId_key"
  ON "onboarding_need_mappings"("questionId", "optionKey", "needId", "solutionId");

CREATE INDEX IF NOT EXISTS "onboarding_need_mappings_needId_idx"
  ON "onboarding_need_mappings"("needId");

DO $$ BEGIN
  ALTER TABLE "onboarding_need_mappings"
    ADD CONSTRAINT "onboarding_need_mappings_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "onboarding_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "onboarding_need_mappings"
    ADD CONSTRAINT "onboarding_need_mappings_needId_fkey"
    FOREIGN KEY ("needId") REFERENCES "onboarding_needs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "onboarding_need_mappings"
    ADD CONSTRAINT "onboarding_need_mappings_solutionId_fkey"
    FOREIGN KEY ("solutionId") REFERENCES "onboarding_solutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
