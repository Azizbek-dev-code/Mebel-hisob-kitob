-- O'sish calendar / plan events. PERSONAL workspace only — no storeId.

DO $$ BEGIN
  CREATE TYPE "GrowthEventPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GrowthEventRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_calendar_events" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "note" TEXT,
  "category" TEXT,
  "priority" "GrowthEventPriority" NOT NULL DEFAULT 'MEDIUM',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "allDay" BOOLEAN NOT NULL DEFAULT false,
  "recurrence" "GrowthEventRecurrence" NOT NULL DEFAULT 'NONE',
  "intervalDays" INTEGER,
  "remindMinutesBefore" INTEGER,
  "isCancelled" BOOLEAN NOT NULL DEFAULT false,
  "linkedGoalId" TEXT,
  "linkedTodoId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_calendar_events_workspaceId_startsAt_idx"
  ON "growth_calendar_events"("workspaceId", "startsAt");

CREATE INDEX IF NOT EXISTS "growth_calendar_events_workspaceId_isCancelled_startsAt_idx"
  ON "growth_calendar_events"("workspaceId", "isCancelled", "startsAt");

DO $$ BEGIN
  ALTER TABLE "growth_calendar_events"
    ADD CONSTRAINT "growth_calendar_events_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
