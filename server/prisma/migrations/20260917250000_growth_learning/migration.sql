-- O'sish learning goals + study sessions. PERSONAL workspace only.

DO $$ BEGIN
  CREATE TYPE "GrowthLearningCategory" AS ENUM (
    'READING', 'COURSE', 'BOOK', 'IELTS', 'PROGRAMMING', 'LANGUAGE', 'SKILL', 'CUSTOM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GrowthLearningGoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_learning_goals" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" "GrowthLearningCategory" NOT NULL DEFAULT 'CUSTOM',
  "status" "GrowthLearningGoalStatus" NOT NULL DEFAULT 'ACTIVE',
  "targetValue" DOUBLE PRECISION NOT NULL,
  "targetUnit" TEXT NOT NULL DEFAULT 'score',
  "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deadline" TIMESTAMP(3),
  "totalStudyMinutes" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_learning_goals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_learning_goals_workspaceId_status_sortOrder_idx"
  ON "growth_learning_goals"("workspaceId", "status", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "growth_learning_goals"
    ADD CONSTRAINT "growth_learning_goals_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_learning_milestones" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "goalId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "targetValue" DOUBLE PRECISION NOT NULL,
  "isReached" BOOLEAN NOT NULL DEFAULT false,
  "reachedAt" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_learning_milestones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_learning_milestones_goalId_sortOrder_idx"
  ON "growth_learning_milestones"("goalId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "growth_learning_milestones"
    ADD CONSTRAINT "growth_learning_milestones_goalId_fkey"
    FOREIGN KEY ("goalId") REFERENCES "growth_learning_goals"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_learning_sessions" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "goalId" TEXT,
  "status" "GrowthFocusStatus" NOT NULL DEFAULT 'COMPLETED',
  "plannedMinutes" INTEGER,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  "creditedMinutes" INTEGER NOT NULL DEFAULT 0,
  "clientReportedSeconds" INTEGER,
  "note" TEXT,
  "discardReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_learning_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_learning_sessions_workspaceId_startedAt_idx"
  ON "growth_learning_sessions"("workspaceId", "startedAt");

CREATE INDEX IF NOT EXISTS "growth_learning_sessions_workspaceId_identityId_startedAt_idx"
  ON "growth_learning_sessions"("workspaceId", "identityId", "startedAt");

CREATE INDEX IF NOT EXISTS "growth_learning_sessions_goalId_startedAt_idx"
  ON "growth_learning_sessions"("goalId", "startedAt");

DO $$ BEGIN
  ALTER TABLE "growth_learning_sessions"
    ADD CONSTRAINT "growth_learning_sessions_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "growth_learning_sessions"
    ADD CONSTRAINT "growth_learning_sessions_goalId_fkey"
    FOREIGN KEY ("goalId") REFERENCES "growth_learning_goals"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
