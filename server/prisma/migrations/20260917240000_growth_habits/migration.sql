-- O'sish habits + daily goals. PERSONAL workspace only.

DO $$ BEGIN
  CREATE TYPE "GrowthHabitFrequency" AS ENUM ('DAILY', 'WEEKLY', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_habits" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "frequency" "GrowthHabitFrequency" NOT NULL DEFAULT 'DAILY',
  "intervalDays" INTEGER,
  "targetValue" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "targetUnit" TEXT NOT NULL DEFAULT 'times',
  "remindMinutesBefore" INTEGER,
  "linkedGoalId" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "bestStreak" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_habits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_habits_workspaceId_isArchived_sortOrder_idx"
  ON "growth_habits"("workspaceId", "isArchived", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "growth_habits"
    ADD CONSTRAINT "growth_habits_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_habit_check_ins" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "habitId" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_habit_check_ins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_habit_check_ins_habitId_dayKey_key"
  ON "growth_habit_check_ins"("habitId", "dayKey");

CREATE INDEX IF NOT EXISTS "growth_habit_check_ins_workspaceId_dayKey_idx"
  ON "growth_habit_check_ins"("workspaceId", "dayKey");

DO $$ BEGIN
  ALTER TABLE "growth_habit_check_ins"
    ADD CONSTRAINT "growth_habit_check_ins_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "growth_habit_check_ins"
    ADD CONSTRAINT "growth_habit_check_ins_habitId_fkey"
    FOREIGN KEY ("habitId") REFERENCES "growth_habits"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_daily_goals" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "estimatedMinutes" INTEGER,
  "isDone" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_daily_goals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_daily_goals_workspaceId_dayKey_sortOrder_idx"
  ON "growth_daily_goals"("workspaceId", "dayKey", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "growth_daily_goals"
    ADD CONSTRAINT "growth_daily_goals_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
