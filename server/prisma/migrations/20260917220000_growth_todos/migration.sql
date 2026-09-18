-- O'sish todos. PERSONAL workspace only — not ERP AssemblyTask.

DO $$ BEGIN
  CREATE TYPE "GrowthTodoStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_todos" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" "GrowthEventPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "GrowthTodoStatus" NOT NULL DEFAULT 'TODO',
  "category" TEXT,
  "dueAt" TIMESTAMP(3),
  "remindMinutesBefore" INTEGER,
  "estimatedMinutes" INTEGER,
  "actualMinutes" INTEGER NOT NULL DEFAULT 0,
  "recurrence" "GrowthEventRecurrence" NOT NULL DEFAULT 'NONE',
  "intervalDays" INTEGER,
  "isDailyFocus" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "linkedGoalId" TEXT,
  "linkedCalendarEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_todos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_todos_workspaceId_status_dueAt_idx"
  ON "growth_todos"("workspaceId", "status", "dueAt");

CREATE INDEX IF NOT EXISTS "growth_todos_workspaceId_isDailyFocus_status_idx"
  ON "growth_todos"("workspaceId", "isDailyFocus", "status");

DO $$ BEGIN
  ALTER TABLE "growth_todos"
    ADD CONSTRAINT "growth_todos_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
