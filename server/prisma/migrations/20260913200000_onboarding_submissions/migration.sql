-- Versioned onboarding submissions. No storeId — Personal overlay, not ERP backup.

DO $$ BEGIN
  CREATE TYPE "OnboardingSubmissionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "onboarding_submissions" (
  "id" TEXT NOT NULL,
  "publicToken" TEXT NOT NULL,
  "flowKey" TEXT NOT NULL,
  "flowVersion" INTEGER NOT NULL,
  "experimentKey" TEXT,
  "status" "OnboardingSubmissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "answers" JSONB NOT NULL DEFAULT '{}',
  "identityId" TEXT,
  "workspaceId" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "onboarding_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_submissions_publicToken_key" ON "onboarding_submissions"("publicToken");
CREATE INDEX IF NOT EXISTS "onboarding_submissions_status_createdAt_idx" ON "onboarding_submissions"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "onboarding_submissions_flowKey_flowVersion_idx" ON "onboarding_submissions"("flowKey", "flowVersion");
CREATE INDEX IF NOT EXISTS "onboarding_submissions_identityId_idx" ON "onboarding_submissions"("identityId");

ALTER TABLE "onboarding_submissions" DROP CONSTRAINT IF EXISTS "onboarding_submissions_identityId_fkey";
ALTER TABLE "onboarding_submissions"
  ADD CONSTRAINT "onboarding_submissions_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "onboarding_submissions" DROP CONSTRAINT IF EXISTS "onboarding_submissions_workspaceId_fkey";
ALTER TABLE "onboarding_submissions"
  ADD CONSTRAINT "onboarding_submissions_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "onboarding_sensitive_answers" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "customMonthlyIncomeSom" BIGINT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "onboarding_sensitive_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_sensitive_answers_submissionId_key"
  ON "onboarding_sensitive_answers"("submissionId");

ALTER TABLE "onboarding_sensitive_answers" DROP CONSTRAINT IF EXISTS "onboarding_sensitive_answers_submissionId_fkey";
ALTER TABLE "onboarding_sensitive_answers"
  ADD CONSTRAINT "onboarding_sensitive_answers_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "onboarding_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "personal_profiles" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "goals" JSONB NOT NULL DEFAULT '[]',
  "discoverySource" TEXT,
  "monthlyIncomeBand" TEXT,
  "helpWith" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "personal_profiles_workspaceId_key" ON "personal_profiles"("workspaceId");

ALTER TABLE "personal_profiles" DROP CONSTRAINT IF EXISTS "personal_profiles_workspaceId_fkey";
ALTER TABLE "personal_profiles"
  ADD CONSTRAINT "personal_profiles_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
