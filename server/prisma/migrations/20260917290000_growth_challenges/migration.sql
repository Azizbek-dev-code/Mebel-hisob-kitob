-- O'sish Challenge + Fight (Identity-scoped social competition).

DO $$ BEGIN
  CREATE TYPE "GrowthChallengeKind" AS ENUM ('FIGHT', 'GROUP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GrowthChallengeMetric" AS ENUM (
    'FOCUS_MINUTES',
    'TASKS_COMPLETED',
    'LEARNING_MINUTES',
    'XP_GAINED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GrowthChallengeStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GrowthChallengeParticipantStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED', 'LEFT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_challenges" (
  "id" TEXT NOT NULL,
  "kind" "GrowthChallengeKind" NOT NULL,
  "title" TEXT NOT NULL,
  "metric" "GrowthChallengeMetric" NOT NULL,
  "targetValue" INTEGER,
  "durationDays" INTEGER NOT NULL,
  "status" "GrowthChallengeStatus" NOT NULL DEFAULT 'PENDING',
  "createdById" TEXT NOT NULL,
  "rewardXp" INTEGER NOT NULL DEFAULT 50,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "winnerId" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_challenges_createdById_status_idx"
  ON "growth_challenges"("createdById", "status");

CREATE INDEX IF NOT EXISTS "growth_challenges_status_endAt_idx"
  ON "growth_challenges"("status", "endAt");

DO $$ BEGIN
  ALTER TABLE "growth_challenges"
    ADD CONSTRAINT "growth_challenges_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_challenge_participants" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "status" "GrowthChallengeParticipantStatus" NOT NULL DEFAULT 'INVITED',
  "score" INTEGER NOT NULL DEFAULT 0,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_challenge_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_challenge_participants_challengeId_identityId_key"
  ON "growth_challenge_participants"("challengeId", "identityId");

CREATE INDEX IF NOT EXISTS "growth_challenge_participants_identityId_status_idx"
  ON "growth_challenge_participants"("identityId", "status");

DO $$ BEGIN
  ALTER TABLE "growth_challenge_participants"
    ADD CONSTRAINT "growth_challenge_participants_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "growth_challenges"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "growth_challenge_participants"
    ADD CONSTRAINT "growth_challenge_participants_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
