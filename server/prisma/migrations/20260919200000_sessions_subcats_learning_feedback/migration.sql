-- Additive: device sessions, category tree + lucide icons, learning expansion,
-- challenge task/reading targets, in-app feedback, email verified flag.
-- Existing rows keep working (nullable columns / empty JSON).

ALTER TABLE "identities" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "identities" ADD COLUMN IF NOT EXISTS "feedbackOnboardingDismissedAt" TIMESTAMP(3);
ALTER TABLE "identities" ADD COLUMN IF NOT EXISTS "feedbackOutcomeDismissedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" TEXT NOT NULL,
  "identityId" TEXT,
  "userId" TEXT,
  "deviceLabel" TEXT,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "rememberMe" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),

  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "auth_sessions_identityId_revokedAt_idx"
  ON "auth_sessions"("identityId", "revokedAt");
CREATE INDEX IF NOT EXISTS "auth_sessions_userId_revokedAt_idx"
  ON "auth_sessions"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "auth_sessions_expiresAt_idx"
  ON "auth_sessions"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "auth_sessions_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "auth_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "app_feedbacks" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "rating" INTEGER,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "app_feedbacks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "app_feedbacks_identityId_kind_createdAt_idx"
  ON "app_feedbacks"("identityId", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "app_feedbacks_isPublic_createdAt_idx"
  ON "app_feedbacks"("isPublic", "createdAt");

DO $$ BEGIN
  ALTER TABLE "app_feedbacks"
    ADD CONSTRAINT "app_feedbacks_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "app_feedback_reactions" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "app_feedback_reactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_feedback_reactions_feedbackId_identityId_key"
  ON "app_feedback_reactions"("feedbackId", "identityId");

DO $$ BEGIN
  ALTER TABLE "app_feedback_reactions"
    ADD CONSTRAINT "app_feedback_reactions_feedbackId_fkey"
    FOREIGN KEY ("feedbackId") REFERENCES "app_feedbacks"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "app_feedback_reactions"
    ADD CONSTRAINT "app_feedback_reactions_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "app_feedback_views" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "app_feedback_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_feedback_views_feedbackId_identityId_key"
  ON "app_feedback_views"("feedbackId", "identityId");

DO $$ BEGIN
  ALTER TABLE "app_feedback_views"
    ADD CONSTRAINT "app_feedback_views_feedbackId_fkey"
    FOREIGN KEY ("feedbackId") REFERENCES "app_feedbacks"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "app_feedback_views"
    ADD CONSTRAINT "app_feedback_views_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "personal_categories" ADD COLUMN IF NOT EXISTS "iconName" TEXT;
ALTER TABLE "personal_categories" ADD COLUMN IF NOT EXISTS "iconColor" TEXT;
ALTER TABLE "personal_categories" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

CREATE INDEX IF NOT EXISTS "personal_categories_parentId_idx"
  ON "personal_categories"("parentId");

DO $$ BEGIN
  ALTER TABLE "personal_categories"
    ADD CONSTRAINT "personal_categories_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "personal_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "growth_learning_goals" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "growth_learning_goals" ADD COLUMN IF NOT EXISTS "dailyMinutes" INTEGER;
ALTER TABLE "growth_learning_goals" ADD COLUMN IF NOT EXISTS "linkedTodoIds" TEXT;

ALTER TABLE "growth_challenges" ADD COLUMN IF NOT EXISTS "todoIds" TEXT;
ALTER TABLE "growth_challenges" ADD COLUMN IF NOT EXISTS "dailyTargetMinutes" INTEGER;

-- Prisma/Postgres: ADD VALUE cannot run in the same transaction as USING the value
-- on some versions; these are additive enum labels only.
DO $$ BEGIN
  ALTER TYPE "GrowthLearningCategory" ADD VALUE IF NOT EXISTS 'WORK';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "GrowthLearningCategory" ADD VALUE IF NOT EXISTS 'SPORT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Preserve GrowthAim rows by copying into Taraqqiyot (learning) goals. Table is kept.
INSERT INTO "growth_learning_goals" (
  "id",
  "workspaceId",
  "title",
  "description",
  "category",
  "status",
  "targetValue",
  "targetUnit",
  "currentValue",
  "deadline",
  "totalStudyMinutes",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  'aimmig_' || a."id",
  a."workspaceId",
  a."title",
  a."note",
  -- Bare string / CASE expressions are typed as text; Postgres will not
  -- auto-cast them into enums on INSERT … SELECT (error 42804 / P3018).
  'CUSTOM'::"GrowthLearningCategory",
  CASE
    WHEN a."status" = 'COMPLETED' THEN 'COMPLETED'::"GrowthLearningGoalStatus"
    WHEN a."status" = 'ARCHIVED' THEN 'ARCHIVED'::"GrowthLearningGoalStatus"
    ELSE 'ACTIVE'::"GrowthLearningGoalStatus"
  END,
  1,
  'goal',
  CASE WHEN a."status" = 'COMPLETED' THEN 1 ELSE 0 END,
  a."targetDate",
  0,
  0,
  a."createdAt",
  a."updatedAt"
FROM "growth_aims" a
WHERE NOT EXISTS (
  SELECT 1
  FROM "growth_learning_goals" g
  WHERE g."workspaceId" = a."workspaceId"
    AND g."title" = a."title"
);
