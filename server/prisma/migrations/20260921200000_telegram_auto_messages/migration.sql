-- Universal Auto Message builder + per-send idempotency ledger.

CREATE TYPE "TelegramAutoMessageAccountType" AS ENUM ('PERSONAL', 'BUSINESS');

CREATE TYPE "TelegramAutoMessageRecurrence" AS ENUM (
  'EVERY_DAY',
  'EVERY_WEEK',
  'EVERY_MONTH',
  'EVERY_15_DAYS',
  'ONE_TIME'
);

CREATE TYPE "TelegramAutoMessageExecutionStatus" AS ENUM (
  'SENT',
  'FAILED',
  'SKIPPED',
  'NO_CONNECTION'
);

CREATE TABLE "telegram_auto_messages" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "accountType" "TelegramAutoMessageAccountType" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "recurrence" "TelegramAutoMessageRecurrence" NOT NULL DEFAULT 'EVERY_DAY',
  "hour" INTEGER NOT NULL DEFAULT 8,
  "minute" INTEGER NOT NULL DEFAULT 0,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
  "weekday" INTEGER,
  "monthDay" INTEGER,
  "startDate" TIMESTAMP(3),
  "messageBody" TEXT NOT NULL DEFAULT '',
  "resultKeys" JSONB NOT NULL DEFAULT '[]',
  "thresholdConfig" JSONB,
  "ctaEnabled" BOOLEAN NOT NULL DEFAULT false,
  "ctaLabel" TEXT,
  "ctaPath" TEXT,
  "legacyKind" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "telegram_auto_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_auto_messages_legacyKind_key"
  ON "telegram_auto_messages"("legacyKind");

CREATE INDEX "telegram_auto_messages_enabled_accountType_idx"
  ON "telegram_auto_messages"("enabled", "accountType");

CREATE INDEX "telegram_auto_messages_enabled_recurrence_idx"
  ON "telegram_auto_messages"("enabled", "recurrence");

CREATE TABLE "telegram_auto_message_executions" (
  "id" TEXT NOT NULL,
  "autoMessageId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "status" "TelegramAutoMessageExecutionStatus" NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "telegram_auto_message_executions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_auto_message_executions_autoMessageId_identityId_accountId_periodKey_key"
  ON "telegram_auto_message_executions"("autoMessageId", "identityId", "accountId", "periodKey");

CREATE INDEX "telegram_auto_message_executions_autoMessageId_createdAt_idx"
  ON "telegram_auto_message_executions"("autoMessageId", "createdAt");

CREATE INDEX "telegram_auto_message_executions_identityId_createdAt_idx"
  ON "telegram_auto_message_executions"("identityId", "createdAt");

ALTER TABLE "telegram_auto_message_executions"
  ADD CONSTRAINT "telegram_auto_message_executions_autoMessageId_fkey"
  FOREIGN KEY ("autoMessageId") REFERENCES "telegram_auto_messages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
