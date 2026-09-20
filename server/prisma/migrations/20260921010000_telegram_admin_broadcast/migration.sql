-- Telegram unlink/relink: inactive rows must not block a new identity.
-- Admin bot config, /start content, and durable broadcast sending.

ALTER TABLE "telegram_connections" ADD COLUMN IF NOT EXISTS "disconnectedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "telegram_connections_telegramUserId_key";

CREATE INDEX IF NOT EXISTS "telegram_connections_telegramUserId_idx"
  ON "telegram_connections"("telegramUserId");

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_connections_telegram_user_id_active_key"
  ON "telegram_connections"("telegramUserId")
  WHERE "isActive" = true;

DO $$ BEGIN
  CREATE TYPE "TelegramMediaKind" AS ENUM ('NONE', 'IMAGE', 'VIDEO', 'DOCUMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TelegramBroadcastStatus" AS ENUM ('PENDING', 'SENDING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TelegramBroadcastRecipientStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "telegram_bot_config" (
    "id" TEXT NOT NULL,
    "botUsername" TEXT,
    "botFirstName" TEXT,
    "encryptedBotToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_bot_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "telegram_start_messages" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "mediaKind" "TelegramMediaKind" NOT NULL DEFAULT 'NONE',
    "imageUrl" TEXT,
    "buttonText" TEXT,
    "buttonUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_start_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "telegram_broadcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "mediaKind" "TelegramMediaKind" NOT NULL DEFAULT 'NONE',
    "imageUrl" TEXT,
    "buttonText" TEXT,
    "buttonUrl" TEXT,
    "status" "TelegramBroadcastStatus" NOT NULL DEFAULT 'PENDING',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_broadcasts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "telegram_broadcast_recipients" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "connectionId" TEXT,
    "telegramUserId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "status" "TelegramBroadcastRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_broadcast_recipients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "telegram_broadcasts_status_createdAt_idx" ON "telegram_broadcasts"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "telegram_broadcasts_createdAt_idx" ON "telegram_broadcasts"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "telegram_broadcast_recipients_broadcastId_telegramUserId_key"
  ON "telegram_broadcast_recipients"("broadcastId", "telegramUserId");
CREATE INDEX IF NOT EXISTS "telegram_broadcast_recipients_broadcastId_status_idx"
  ON "telegram_broadcast_recipients"("broadcastId", "status");

ALTER TABLE "telegram_broadcasts"
  DROP CONSTRAINT IF EXISTS "telegram_broadcasts_createdById_fkey";
ALTER TABLE "telegram_broadcasts"
  ADD CONSTRAINT "telegram_broadcasts_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "telegram_broadcast_recipients"
  DROP CONSTRAINT IF EXISTS "telegram_broadcast_recipients_broadcastId_fkey";
ALTER TABLE "telegram_broadcast_recipients"
  ADD CONSTRAINT "telegram_broadcast_recipients_broadcastId_fkey"
  FOREIGN KEY ("broadcastId") REFERENCES "telegram_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "telegram_broadcast_recipients"
  DROP CONSTRAINT IF EXISTS "telegram_broadcast_recipients_connectionId_fkey";
ALTER TABLE "telegram_broadcast_recipients"
  ADD CONSTRAINT "telegram_broadcast_recipients_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "telegram_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "telegram_bot_config" ("id", "isActive", "createdAt", "updatedAt")
VALUES ('default', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "telegram_start_messages" ("id", "text", "mediaKind", "isActive", "createdAt", "updatedAt")
VALUES (
  'default',
  $start$Assalomu alaykum! 👋

Balancy Space'ga xush kelibsiz.

Moliyangizni, rejalaringizni va kundalik hayotingizni bir joyda boshqaring.

🚀 Dasturga kirish:
https://balancy.space$start$,
  'NONE',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
