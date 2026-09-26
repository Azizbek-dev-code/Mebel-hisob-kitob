-- Additive: monthly Global Ranking competitions, rewards, winner snapshots.
-- Safe / reversible: DROP TABLE in reverse order if needed. No destructive alters.

CREATE TYPE "GlobalCompetitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FINALIZED', 'CANCELLED');
CREATE TYPE "GlobalRewardPlace" AS ENUM ('FIRST', 'SECOND', 'THIRD');
CREATE TYPE "GlobalRewardDeliveryStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DELIVERED');

CREATE TABLE "global_monthly_competitions" (
    "id" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "GlobalCompetitionStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_monthly_competitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "global_monthly_competitions_periodKey_key" ON "global_monthly_competitions"("periodKey");
CREATE INDEX "global_monthly_competitions_status_startsAt_idx" ON "global_monthly_competitions"("status", "startsAt");

CREATE TABLE "global_monthly_rewards" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "place" "GlobalRewardPlace" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "valueText" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_monthly_rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "global_monthly_rewards_competitionId_place_key" ON "global_monthly_rewards"("competitionId", "place");

ALTER TABLE "global_monthly_rewards"
  ADD CONSTRAINT "global_monthly_rewards_competitionId_fkey"
  FOREIGN KEY ("competitionId") REFERENCES "global_monthly_competitions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "global_monthly_winners" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "rewardId" TEXT,
    "identityId" TEXT NOT NULL,
    "place" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "handle" TEXT,
    "level" INTEGER NOT NULL,
    "periodXp" INTEGER NOT NULL,
    "totalXp" INTEGER NOT NULL,
    "deliveryStatus" "GlobalRewardDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_monthly_winners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "global_monthly_winners_competitionId_place_key" ON "global_monthly_winners"("competitionId", "place");
CREATE UNIQUE INDEX "global_monthly_winners_competitionId_identityId_key" ON "global_monthly_winners"("competitionId", "identityId");
CREATE INDEX "global_monthly_winners_identityId_idx" ON "global_monthly_winners"("identityId");
CREATE INDEX "global_monthly_winners_deliveryStatus_idx" ON "global_monthly_winners"("deliveryStatus");

ALTER TABLE "global_monthly_winners"
  ADD CONSTRAINT "global_monthly_winners_competitionId_fkey"
  FOREIGN KEY ("competitionId") REFERENCES "global_monthly_competitions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "global_monthly_winners"
  ADD CONSTRAINT "global_monthly_winners_rewardId_fkey"
  FOREIGN KEY ("rewardId") REFERENCES "global_monthly_rewards"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
