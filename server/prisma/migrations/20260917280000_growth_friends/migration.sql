-- O'sish friends (Identity ↔ Identity). Referral is unrelated.

DO $$ BEGIN
  CREATE TYPE "GrowthFriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_friendships" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "addresseeId" TEXT NOT NULL,
  "pairKey" TEXT NOT NULL,
  "status" "GrowthFriendshipStatus" NOT NULL DEFAULT 'PENDING',
  "blockedById" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_friendships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_friendships_pairKey_key"
  ON "growth_friendships"("pairKey");

CREATE INDEX IF NOT EXISTS "growth_friendships_requesterId_status_idx"
  ON "growth_friendships"("requesterId", "status");

CREATE INDEX IF NOT EXISTS "growth_friendships_addresseeId_status_idx"
  ON "growth_friendships"("addresseeId", "status");

DO $$ BEGIN
  ALTER TABLE "growth_friendships"
    ADD CONSTRAINT "growth_friendships_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "growth_friendships"
    ADD CONSTRAINT "growth_friendships_addresseeId_fkey"
    FOREIGN KEY ("addresseeId") REFERENCES "identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_social_profiles" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "handle" TEXT,
  "bio" TEXT,
  "showLevel" BOOLEAN NOT NULL DEFAULT true,
  "showActivity" BOOLEAN NOT NULL DEFAULT true,
  "allowFriendRequests" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_social_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_social_profiles_identityId_key"
  ON "growth_social_profiles"("identityId");

CREATE UNIQUE INDEX IF NOT EXISTS "growth_social_profiles_handle_key"
  ON "growth_social_profiles"("handle");

DO $$ BEGIN
  ALTER TABLE "growth_social_profiles"
    ADD CONSTRAINT "growth_social_profiles_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "identities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
