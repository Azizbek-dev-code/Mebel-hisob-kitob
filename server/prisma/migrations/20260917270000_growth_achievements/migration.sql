-- O'sish achievements. Catalog is code-defined; unlocks are per workspace.

DO $$ BEGIN
  ALTER TYPE "GrowthXpSource" ADD VALUE IF NOT EXISTS 'ACHIEVEMENT_UNLOCKED';
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_achievement_unlocks" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "achievementKey" TEXT NOT NULL,
  "rewardXp" INTEGER NOT NULL DEFAULT 0,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "growth_achievement_unlocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_achievement_unlocks_workspaceId_achievementKey_key"
  ON "growth_achievement_unlocks"("workspaceId", "achievementKey");

CREATE INDEX IF NOT EXISTS "growth_achievement_unlocks_workspaceId_unlockedAt_idx"
  ON "growth_achievement_unlocks"("workspaceId", "unlockedAt");

DO $$ BEGIN
  ALTER TABLE "growth_achievement_unlocks"
    ADD CONSTRAINT "growth_achievement_unlocks_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
