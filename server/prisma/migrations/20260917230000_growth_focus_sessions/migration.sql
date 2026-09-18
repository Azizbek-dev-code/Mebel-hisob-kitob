-- O'sish Pomodoro / focus sessions. PERSONAL workspace only.

DO $$ BEGIN
  CREATE TYPE "GrowthFocusKind" AS ENUM ('FOCUS', 'BREAK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GrowthFocusStatus" AS ENUM ('RUNNING', 'COMPLETED', 'INTERRUPTED', 'DISCARDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_focus_sessions" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "todoId" TEXT,
  "linkedGoalId" TEXT,
  "kind" "GrowthFocusKind" NOT NULL DEFAULT 'FOCUS',
  "status" "GrowthFocusStatus" NOT NULL DEFAULT 'RUNNING',
  "plannedMinutes" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  "creditedMinutes" INTEGER NOT NULL DEFAULT 0,
  "clientReportedSeconds" INTEGER,
  "discardReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_focus_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_focus_sessions_workspaceId_status_startedAt_idx"
  ON "growth_focus_sessions"("workspaceId", "status", "startedAt");

CREATE INDEX IF NOT EXISTS "growth_focus_sessions_workspaceId_identityId_startedAt_idx"
  ON "growth_focus_sessions"("workspaceId", "identityId", "startedAt");

CREATE INDEX IF NOT EXISTS "growth_focus_sessions_todoId_idx"
  ON "growth_focus_sessions"("todoId");

DO $$ BEGIN
  ALTER TABLE "growth_focus_sessions"
    ADD CONSTRAINT "growth_focus_sessions_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "growth_focus_sessions"
    ADD CONSTRAINT "growth_focus_sessions_todoId_fkey"
    FOREIGN KEY ("todoId") REFERENCES "growth_todos"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
