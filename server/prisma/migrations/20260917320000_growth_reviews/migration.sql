-- O'sish weekly review + monthly life report (reflection persisted; metrics live).

CREATE TABLE IF NOT EXISTS "growth_weekly_reviews" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "weekStartDayKey" TEXT NOT NULL,
  "wentWell" TEXT,
  "wasHard" TEXT,
  "nextWeekChange" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_weekly_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_weekly_reviews_workspaceId_weekStartDayKey_key"
  ON "growth_weekly_reviews"("workspaceId", "weekStartDayKey");

CREATE INDEX IF NOT EXISTS "growth_weekly_reviews_workspaceId_identityId_idx"
  ON "growth_weekly_reviews"("workspaceId", "identityId");

DO $$ BEGIN
  ALTER TABLE "growth_weekly_reviews"
    ADD CONSTRAINT "growth_weekly_reviews_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_monthly_reports" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "yearMonth" TEXT NOT NULL,
  "highlight" TEXT,
  "lesson" TEXT,
  "nextMonthIntent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_monthly_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_monthly_reports_workspaceId_yearMonth_key"
  ON "growth_monthly_reports"("workspaceId", "yearMonth");

CREATE INDEX IF NOT EXISTS "growth_monthly_reports_workspaceId_identityId_idx"
  ON "growth_monthly_reports"("workspaceId", "identityId");

DO $$ BEGIN
  ALTER TABLE "growth_monthly_reports"
    ADD CONSTRAINT "growth_monthly_reports_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
