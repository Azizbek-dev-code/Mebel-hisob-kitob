-- O'sish friend streaks (pair activity). Leaderboard is computed — no extra table.

CREATE TABLE IF NOT EXISTS "growth_friend_streaks" (
  "id" TEXT NOT NULL,
  "pairKey" TEXT NOT NULL,
  "identityAId" TEXT NOT NULL,
  "identityBId" TEXT NOT NULL,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "bestStreak" INTEGER NOT NULL DEFAULT 0,
  "lastSharedDayKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_friend_streaks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_friend_streaks_pairKey_key"
  ON "growth_friend_streaks"("pairKey");

CREATE INDEX IF NOT EXISTS "growth_friend_streaks_identityAId_idx"
  ON "growth_friend_streaks"("identityAId");

CREATE INDEX IF NOT EXISTS "growth_friend_streaks_identityBId_idx"
  ON "growth_friend_streaks"("identityBId");

DO $$ BEGIN
  ALTER TABLE "growth_friend_streaks"
    ADD CONSTRAINT "growth_friend_streaks_identityAId_fkey"
    FOREIGN KEY ("identityAId") REFERENCES "identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "growth_friend_streaks"
    ADD CONSTRAINT "growth_friend_streaks_identityBId_fkey"
    FOREIGN KEY ("identityBId") REFERENCES "identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
