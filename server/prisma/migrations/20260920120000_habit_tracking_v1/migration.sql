-- Habit tracking v1: schedule, goals, logs, checklist, config history, timezone.
-- Additive / backfill only — existing check-ins and habits are preserved.

DO $$ BEGIN
  ALTER TYPE "GrowthHabitFrequency" ADD VALUE IF NOT EXISTS 'MONTHLY';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "personal_profiles"
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent';

ALTER TABLE "growth_habits"
  ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'GOOD',
  ADD COLUMN IF NOT EXISTS "badMode" TEXT,
  ADD COLUMN IF NOT EXISTS "icon" TEXT,
  ADD COLUMN IF NOT EXISTS "color" TEXT,
  ADD COLUMN IF NOT EXISTS "scheduleKind" TEXT NOT NULL DEFAULT 'EVERY_DAY',
  ADD COLUMN IF NOT EXISTS "weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN IF NOT EXISTS "startDayKey" TEXT,
  ADD COLUMN IF NOT EXISTS "endDayKey" TEXT,
  ADD COLUMN IF NOT EXISTS "timeOfDay" TEXT NOT NULL DEFAULT 'ANY',
  ADD COLUMN IF NOT EXISTS "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reminderTime" TEXT,
  ADD COLUMN IF NOT EXISTS "goalPeriod" TEXT NOT NULL DEFAULT 'DAY',
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "stackAfterHabitId" TEXT,
  ADD COLUMN IF NOT EXISTS "stackCue" TEXT;

UPDATE "growth_habits"
SET "scheduleKind" = CASE
  WHEN "frequency"::text = 'WEEKLY' THEN 'WEEKLY'
  WHEN "frequency"::text = 'CUSTOM' THEN 'INTERVAL'
  WHEN "frequency"::text = 'MONTHLY' THEN 'MONTHLY'
  ELSE 'EVERY_DAY'
END
WHERE "scheduleKind" = 'EVERY_DAY';

CREATE INDEX IF NOT EXISTS "growth_habits_stackAfterHabitId_idx"
  ON "growth_habits"("stackAfterHabitId");

DO $$ BEGIN
  ALTER TABLE "growth_habits"
    ADD CONSTRAINT "growth_habits_stackAfterHabitId_fkey"
    FOREIGN KEY ("stackAfterHabitId") REFERENCES "growth_habits"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "growth_habit_check_ins"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS "skipped" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "goalValueSnapshot" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "goalUnitSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "goalPeriodSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "checklistDone" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "checklistTotal" INTEGER NOT NULL DEFAULT 0;

UPDATE "growth_habit_check_ins" AS ci
SET
  "status" = CASE
    WHEN ci.value + 1e-9 >= h."targetValue" THEN 'COMPLETED'
    WHEN ci.value > 0 THEN 'PARTIAL'
    ELSE 'FAILED'
  END,
  "goalValueSnapshot" = COALESCE(ci."goalValueSnapshot", h."targetValue"),
  "goalUnitSnapshot" = COALESCE(ci."goalUnitSnapshot", h."targetUnit"),
  "goalPeriodSnapshot" = COALESCE(ci."goalPeriodSnapshot", 'DAY')
FROM "growth_habits" AS h
WHERE ci."habitId" = h.id;

CREATE INDEX IF NOT EXISTS "growth_habit_check_ins_habitId_status_idx"
  ON "growth_habit_check_ins"("habitId", "status");

CREATE TABLE IF NOT EXISTS "growth_habit_logs" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "habitId" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  "loggedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "growth_habit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_habit_logs_habitId_dayKey_idx"
  ON "growth_habit_logs"("habitId", "dayKey");
CREATE INDEX IF NOT EXISTS "growth_habit_logs_habitId_loggedAt_idx"
  ON "growth_habit_logs"("habitId", "loggedAt");
CREATE INDEX IF NOT EXISTS "growth_habit_logs_workspaceId_dayKey_idx"
  ON "growth_habit_logs"("workspaceId", "dayKey");
CREATE INDEX IF NOT EXISTS "growth_habit_logs_workspaceId_loggedAt_idx"
  ON "growth_habit_logs"("workspaceId", "loggedAt");

DO $$ BEGIN
  ALTER TABLE "growth_habit_logs"
    ADD CONSTRAINT "growth_habit_logs_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "growth_habit_logs"
    ADD CONSTRAINT "growth_habit_logs_habitId_fkey"
    FOREIGN KEY ("habitId") REFERENCES "growth_habits"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "growth_habit_logs" (
  "id", "workspaceId", "habitId", "dayKey", "value", "note", "loggedAt", "createdAt", "updatedAt"
)
SELECT
  'log_' || ci.id,
  ci."workspaceId",
  ci."habitId",
  ci."dayKey",
  ci.value,
  ci.note,
  ci."createdAt",
  ci."createdAt",
  ci."updatedAt"
FROM "growth_habit_check_ins" ci
WHERE NOT EXISTS (
  SELECT 1 FROM "growth_habit_logs" l
  WHERE l."habitId" = ci."habitId" AND l."dayKey" = ci."dayKey"
);

CREATE TABLE IF NOT EXISTS "growth_habit_checklist_items" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "habitId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "growth_habit_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_habit_checklist_items_habitId_sortOrder_idx"
  ON "growth_habit_checklist_items"("habitId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "growth_habit_checklist_items"
    ADD CONSTRAINT "growth_habit_checklist_items_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "growth_habit_checklist_items"
    ADD CONSTRAINT "growth_habit_checklist_items_habitId_fkey"
    FOREIGN KEY ("habitId") REFERENCES "growth_habits"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_habit_checklist_ticks" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "habitId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "growth_habit_checklist_ticks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_habit_checklist_ticks_itemId_dayKey_key"
  ON "growth_habit_checklist_ticks"("itemId", "dayKey");
CREATE INDEX IF NOT EXISTS "growth_habit_checklist_ticks_habitId_dayKey_idx"
  ON "growth_habit_checklist_ticks"("habitId", "dayKey");
CREATE INDEX IF NOT EXISTS "growth_habit_checklist_ticks_workspaceId_dayKey_idx"
  ON "growth_habit_checklist_ticks"("workspaceId", "dayKey");

DO $$ BEGIN
  ALTER TABLE "growth_habit_checklist_ticks"
    ADD CONSTRAINT "growth_habit_checklist_ticks_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "growth_habit_checklist_ticks"
    ADD CONSTRAINT "growth_habit_checklist_ticks_habitId_fkey"
    FOREIGN KEY ("habitId") REFERENCES "growth_habits"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "growth_habit_checklist_ticks"
    ADD CONSTRAINT "growth_habit_checklist_ticks_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "growth_habit_checklist_items"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_habit_config_versions" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "habitId" TEXT NOT NULL,
  "effectiveFrom" TEXT NOT NULL,
  "effectiveTo" TEXT,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "growth_habit_config_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_habit_config_versions_habitId_effectiveFrom_idx"
  ON "growth_habit_config_versions"("habitId", "effectiveFrom");
CREATE INDEX IF NOT EXISTS "growth_habit_config_versions_workspaceId_idx"
  ON "growth_habit_config_versions"("workspaceId");

DO $$ BEGIN
  ALTER TABLE "growth_habit_config_versions"
    ADD CONSTRAINT "growth_habit_config_versions_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "growth_habit_config_versions"
    ADD CONSTRAINT "growth_habit_config_versions_habitId_fkey"
    FOREIGN KEY ("habitId") REFERENCES "growth_habits"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "growth_habit_config_versions" (
  "id", "workspaceId", "habitId", "effectiveFrom", "effectiveTo", "snapshot", "createdAt"
)
SELECT
  'cfg_' || h.id,
  h."workspaceId",
  h.id,
  COALESCE(h."startDayKey", to_char(h."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')),
  NULL,
  jsonb_build_object(
    'kind', h.kind,
    'badMode', h."badMode",
    'scheduleKind', h."scheduleKind",
    'weekdays', to_jsonb(h.weekdays),
    'intervalDays', h."intervalDays",
    'intervalAnchorDayKey', COALESCE(h."startDayKey", to_char(h."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')),
    'goalValue', h."targetValue",
    'goalUnit', h."targetUnit",
    'goalPeriod', h."goalPeriod",
    'startDayKey', h."startDayKey",
    'endDayKey', h."endDayKey"
  ),
  h."createdAt"
FROM "growth_habits" h
WHERE NOT EXISTS (
  SELECT 1 FROM "growth_habit_config_versions" v WHERE v."habitId" = h.id
);
