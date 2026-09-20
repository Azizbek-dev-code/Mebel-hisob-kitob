-- Presence, privacy-safe analytics, usage XP. No financial columns.

-- PresenceVisibility + AnalyticsAccountType
DO $$ BEGIN
  CREATE TYPE "PresenceVisibility" AS ENUM ('EVERYONE', 'FRIENDS', 'NOBODY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AnalyticsAccountType" AS ENUM ('PERSONAL', 'BUSINESS', 'PLATFORM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "growth_social_profiles"
  ADD COLUMN IF NOT EXISTS "onlineStatusVisibility" "PresenceVisibility" NOT NULL DEFAULT 'FRIENDS',
  ADD COLUMN IF NOT EXISTS "lastSeenVisibility" "PresenceVisibility" NOT NULL DEFAULT 'FRIENDS',
  ADD COLUMN IF NOT EXISTS "showInGlobalRanking" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "identity_presence" (
  "identityId" TEXT NOT NULL,
  "lastActivityAt" TIMESTAMP(3) NOT NULL,
  "lastHeartbeatAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "identity_presence_pkey" PRIMARY KEY ("identityId")
);

CREATE TABLE IF NOT EXISTS "analytics_sessions" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "accountType" "AnalyticsAccountType" NOT NULL,
  "accountId" TEXT,
  "clientSessionId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "lastActivityAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "activeSeconds" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analytics_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "accountType" "AnalyticsAccountType" NOT NULL,
  "accountId" TEXT,
  "eventType" TEXT NOT NULL,
  "feature" TEXT,
  "route" TEXT,
  "sessionId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "daily_user_activity" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "totalUsageSeconds" INTEGER NOT NULL DEFAULT 0,
  "sessionsCount" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "topFeature" TEXT,
  CONSTRAINT "daily_user_activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "daily_feature_usage" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "feature" TEXT NOT NULL,
  "accountType" "AnalyticsAccountType" NOT NULL,
  "activeUsers" INTEGER NOT NULL DEFAULT 0,
  "eventCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "daily_feature_usage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "platform_xp_transactions" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "xp" INTEGER NOT NULL,
  "referenceKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_xp_transactions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "identity_presence"
  ADD CONSTRAINT "identity_presence_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analytics_sessions"
  ADD CONSTRAINT "analytics_sessions_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analytics_events"
  ADD CONSTRAINT "analytics_events_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_user_activity"
  ADD CONSTRAINT "daily_user_activity_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform_xp_transactions"
  ADD CONSTRAINT "platform_xp_transactions_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "analytics_sessions_identityId_clientSessionId_key"
  ON "analytics_sessions"("identityId", "clientSessionId");
CREATE INDEX IF NOT EXISTS "analytics_sessions_identityId_startedAt_idx"
  ON "analytics_sessions"("identityId", "startedAt");
CREATE INDEX IF NOT EXISTS "analytics_sessions_lastActivityAt_idx"
  ON "analytics_sessions"("lastActivityAt");

CREATE INDEX IF NOT EXISTS "analytics_events_identityId_createdAt_idx"
  ON "analytics_events"("identityId", "createdAt");
CREATE INDEX IF NOT EXISTS "analytics_events_eventType_createdAt_idx"
  ON "analytics_events"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "analytics_events_feature_createdAt_idx"
  ON "analytics_events"("feature", "createdAt");
CREATE INDEX IF NOT EXISTS "analytics_events_createdAt_idx"
  ON "analytics_events"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "daily_user_activity_identityId_date_key"
  ON "daily_user_activity"("identityId", "date");
CREATE INDEX IF NOT EXISTS "daily_user_activity_date_idx"
  ON "daily_user_activity"("date");

CREATE UNIQUE INDEX IF NOT EXISTS "daily_feature_usage_date_feature_accountType_key"
  ON "daily_feature_usage"("date", "feature", "accountType");
CREATE INDEX IF NOT EXISTS "daily_feature_usage_date_idx"
  ON "daily_feature_usage"("date");

CREATE UNIQUE INDEX IF NOT EXISTS "platform_xp_transactions_identityId_referenceKey_key"
  ON "platform_xp_transactions"("identityId", "referenceKey");
CREATE INDEX IF NOT EXISTS "platform_xp_transactions_identityId_createdAt_idx"
  ON "platform_xp_transactions"("identityId", "createdAt");
CREATE INDEX IF NOT EXISTS "platform_xp_transactions_eventType_createdAt_idx"
  ON "platform_xp_transactions"("eventType", "createdAt");
