-- O'sish XP / level / streak. PERSONAL workspace only.

DO $$ BEGIN
  CREATE TYPE "GrowthXpSource" AS ENUM (
    'TODO_COMPLETED',
    'HABIT_CHECK_IN',
    'FOCUS_COMPLETED',
    'LEARNING_SESSION',
    'DAILY_GOAL_DONE',
    'MILESTONE_REACHED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_progress" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "totalXp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "bestStreak" INTEGER NOT NULL DEFAULT 0,
  "lastActivityDayKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_progress_workspaceId_key"
  ON "growth_progress"("workspaceId");

CREATE INDEX IF NOT EXISTS "growth_progress_identityId_idx"
  ON "growth_progress"("identityId");

DO $$ BEGIN
  ALTER TABLE "growth_progress"
    ADD CONSTRAINT "growth_progress_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_xp_events" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "source" "GrowthXpSource" NOT NULL,
  "amount" INTEGER NOT NULL,
  "sourceEntityId" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "summary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "growth_xp_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_xp_events_workspaceId_source_sourceEntityId_key"
  ON "growth_xp_events"("workspaceId", "source", "sourceEntityId");

CREATE INDEX IF NOT EXISTS "growth_xp_events_workspaceId_createdAt_idx"
  ON "growth_xp_events"("workspaceId", "createdAt");

CREATE INDEX IF NOT EXISTS "growth_xp_events_workspaceId_dayKey_idx"
  ON "growth_xp_events"("workspaceId", "dayKey");

DO $$ BEGIN
  ALTER TABLE "growth_xp_events"
    ADD CONSTRAINT "growth_xp_events_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
