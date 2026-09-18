-- O'sish Growth in-app notifications (separate from finance derived alerts).

DO $$ BEGIN
  CREATE TYPE "GrowthNotificationKind" AS ENUM (
    'REMINDER',
    'ACHIEVEMENT',
    'FRIEND',
    'FIGHT',
    'STREAK',
    'RESULT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "growth_social_profiles"
  ADD COLUMN IF NOT EXISTS "notifyReminder" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyAchievement" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyFriend" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyFight" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyStreak" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyResult" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "growth_notifications" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "workspaceId" TEXT,
  "kind" "GrowthNotificationKind" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "href" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "dedupeKey" TEXT,
  "readAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "growth_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_notifications_identityId_dedupeKey_key"
  ON "growth_notifications"("identityId", "dedupeKey");

CREATE INDEX IF NOT EXISTS "growth_notifications_identityId_createdAt_idx"
  ON "growth_notifications"("identityId", "createdAt");

CREATE INDEX IF NOT EXISTS "growth_notifications_identityId_readAt_idx"
  ON "growth_notifications"("identityId", "readAt");

CREATE INDEX IF NOT EXISTS "growth_notifications_workspaceId_createdAt_idx"
  ON "growth_notifications"("workspaceId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "growth_notifications"
    ADD CONSTRAINT "growth_notifications_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "growth_notifications"
    ADD CONSTRAINT "growth_notifications_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
