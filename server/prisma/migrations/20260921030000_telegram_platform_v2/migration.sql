-- Telegram 2.0: Identity-scoped connection is already in place.
-- This migration adds per-account prefs, dynamic /start menus, automations,
-- and scheduled/audience broadcasts.

ALTER TABLE "telegram_connections"
  ADD COLUMN IF NOT EXISTS "notifyWeeklySummaryBusiness" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "telegram_connections"
  ADD COLUMN IF NOT EXISTS "notifyWeeklySummaryPersonal" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "telegram_connections"
  ADD COLUMN IF NOT EXISTS "notifyMonthlySummaryBusiness" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "telegram_connections"
  ADD COLUMN IF NOT EXISTS "notifyMonthlySummaryPersonal" BOOLEAN NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TYPE "TelegramBroadcastStatus" ADD VALUE 'DRAFT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "TelegramBroadcastStatus" ADD VALUE 'SCHEDULED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "TelegramBroadcastStatus" ADD VALUE 'CANCELLED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TelegramBroadcastAudience" AS ENUM ('ALL', 'PERSONAL', 'BUSINESS', 'PERSONAL_AND_BUSINESS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TelegramMenuButtonAction" AS ENUM ('URL', 'MENU', 'BACK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TelegramAutomationKind" AS ENUM (
    'PERSONAL_MORNING',
    'PERSONAL_EVENING',
    'PERSONAL_WEEKLY',
    'PERSONAL_MONTHLY',
    'BUSINESS_MORNING',
    'BUSINESS_EVENING',
    'BUSINESS_WEEKLY',
    'BUSINESS_MONTHLY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TelegramAutomationLogStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "telegram_start_messages"
  ADD COLUMN IF NOT EXISTS "buttons" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "telegram_broadcasts"
  ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "telegram_broadcasts"
  ADD COLUMN IF NOT EXISTS "audience" "TelegramBroadcastAudience" NOT NULL DEFAULT 'ALL';
ALTER TABLE "telegram_broadcasts"
  ADD COLUMN IF NOT EXISTS "audienceFilter" JSONB;
ALTER TABLE "telegram_broadcasts"
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent';
ALTER TABLE "telegram_broadcasts"
  ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "telegram_broadcasts"
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "telegram_broadcasts_status_scheduledAt_idx"
  ON "telegram_broadcasts"("status", "scheduledAt");

CREATE TABLE IF NOT EXISTS "telegram_menu_screens" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL,
    "mediaKind" "TelegramMediaKind" NOT NULL DEFAULT 'NONE',
    "imageUrl" TEXT,
    "categoryKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "telegram_menu_screens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_menu_screens_slug_key" ON "telegram_menu_screens"("slug");
CREATE INDEX IF NOT EXISTS "telegram_menu_screens_isActive_sortOrder_idx"
  ON "telegram_menu_screens"("isActive", "sortOrder");

CREATE TABLE IF NOT EXISTS "telegram_menu_buttons" (
    "id" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "action" "TelegramMenuButtonAction" NOT NULL,
    "url" TEXT,
    "targetSlug" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "telegram_menu_buttons_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "telegram_menu_buttons_screenId_sortOrder_idx"
  ON "telegram_menu_buttons"("screenId", "sortOrder");

ALTER TABLE "telegram_menu_buttons"
  DROP CONSTRAINT IF EXISTS "telegram_menu_buttons_screenId_fkey";
ALTER TABLE "telegram_menu_buttons"
  ADD CONSTRAINT "telegram_menu_buttons_screenId_fkey"
  FOREIGN KEY ("screenId") REFERENCES "telegram_menu_screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "telegram_account_preferences" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "notifyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "telegram_account_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_account_preferences_connectionId_workspaceId_key"
  ON "telegram_account_preferences"("connectionId", "workspaceId");
CREATE INDEX IF NOT EXISTS "telegram_account_preferences_workspaceId_idx"
  ON "telegram_account_preferences"("workspaceId");

ALTER TABLE "telegram_account_preferences"
  DROP CONSTRAINT IF EXISTS "telegram_account_preferences_connectionId_fkey";
ALTER TABLE "telegram_account_preferences"
  ADD CONSTRAINT "telegram_account_preferences_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "telegram_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "telegram_account_preferences"
  DROP CONSTRAINT IF EXISTS "telegram_account_preferences_workspaceId_fkey";
ALTER TABLE "telegram_account_preferences"
  ADD CONSTRAINT "telegram_account_preferences_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "telegram_automations" (
    "id" TEXT NOT NULL,
    "kind" "TelegramAutomationKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "hour" INTEGER NOT NULL DEFAULT 8,
    "minute" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    "weekday" INTEGER,
    "monthDay" INTEGER,
    "messageTemplate" TEXT,
    "ctaLabel" TEXT,
    "ctaPath" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "lastRunLocalKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "telegram_automations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_automations_kind_key" ON "telegram_automations"("kind");
CREATE INDEX IF NOT EXISTS "telegram_automations_enabled_idx" ON "telegram_automations"("enabled");

CREATE TABLE IF NOT EXISTS "telegram_automation_logs" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "identityId" TEXT,
    "workspaceId" TEXT,
    "connectionId" TEXT,
    "status" "TelegramAutomationLogStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "telegram_automation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "telegram_automation_logs_automationId_createdAt_idx"
  ON "telegram_automation_logs"("automationId", "createdAt");
CREATE INDEX IF NOT EXISTS "telegram_automation_logs_identityId_createdAt_idx"
  ON "telegram_automation_logs"("identityId", "createdAt");

ALTER TABLE "telegram_automation_logs"
  DROP CONSTRAINT IF EXISTS "telegram_automation_logs_automationId_fkey";
ALTER TABLE "telegram_automation_logs"
  ADD CONSTRAINT "telegram_automation_logs_automationId_fkey"
  FOREIGN KEY ("automationId") REFERENCES "telegram_automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed per-account prefs for existing Identity connections × workspace memberships.
INSERT INTO "telegram_account_preferences" ("id", "connectionId", "workspaceId", "notifyEnabled", "createdAt", "updatedAt")
SELECT
  'tap_' || replace(gen_random_uuid()::text, '-', ''),
  c."id",
  m."workspaceId",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "telegram_connections" c
JOIN "workspace_memberships" m ON m."identityId" = c."identityId"
ON CONFLICT ("connectionId", "workspaceId") DO NOTHING;

-- Default welcome copy (only if still the original seed).
UPDATE "telegram_start_messages"
SET
  "text" = $welcome$👋 Balancy Space'ga xush kelibsiz!

🏠 Shaxsiy hisob
Daromad, xarajat, qarz, budjet, maqsad va kundalik moliyangizni boshqaring.

💼 Business hisob
Biznesingizning sotuv, ombor, xarajat va hisob-kitoblarini boshqaring.

🚀 Hammasini bitta joyda boshqaring.$welcome$,
  "buttonText" = '🚀 Dasturga kirish',
  "buttonUrl" = 'https://balancy.space',
  "buttons" = $btns$[
    {"text":"🚀 Dasturga kirish","action":"URL","url":"https://balancy.space"},
    {"text":"📚 Batafsil","action":"MENU","targetSlug":"details"}
  ]$btns$::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'default'
  AND (
    "buttons" = '[]'::jsonb
    OR "text" LIKE 'Assalomu alaykum%'
  );

INSERT INTO "telegram_menu_screens" ("id", "slug", "title", "text", "categoryKey", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  (
    'tms_details',
    'details',
    'Balancy Space',
    $t$📚 Balancy Space

🏠 SHAXSIY HISOB

Daromad, xarajat, qarz, budjet, maqsadlar va moliyaviy holatingizni boshqaring.

💼 BUSINESS HISOB

Biznesingizni boshqaring, sotuv va xarajatlarni nazorat qiling.

Business yo‘nalishlari:

🪑 Mebel do‘koni
🧶 Gilam do‘koni
📦 Boshqa bizneslar$t$,
    NULL,
    true,
    10,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tms_personal',
    'personal',
    'Shaxsiy hisob',
    $t$🏠 Shaxsiy hisob

Daromad, xarajat, qarz, budjet, maqsadlar va moliyaviy holatingizni boshqaring.$t$,
    'PERSONAL',
    true,
    20,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tms_business',
    'business',
    'Business',
    $t$💼 Business

Biznesingizni bir joyda boshqaring.$t$,
    'BUSINESS',
    true,
    30,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tms_furniture',
    'furniture',
    'Mebel do‘koni',
    $t$🪑 MEBEL DO‘KONI

Sotuvlar, ombor, mijozlar, qarzdorlik, xarajatlar, xodimlar, yetkazib berish va boshqa jarayonlarni boshqaring.$t$,
    'FURNITURE',
    true,
    40,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tms_carpet',
    'carpet',
    'Gilam do‘koni',
    $t$🧶 GILAM DO‘KONI

Sotuvlar, ombor, mijozlar, qarzdorlik, xarajatlar, xodimlar, yetkazib berish va boshqa jarayonlarni boshqaring.$t$,
    'CARPET',
    true,
    50,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tms_other',
    'other',
    'Boshqa biznes',
    $t$📦 BOSHQA BIZNES

Sotuv, ombor, xarajat va hisob-kitoblarni bir joyda boshqaring.$t$,
    'OTHER',
    true,
    60,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "telegram_menu_buttons" ("id", "screenId", "text", "action", "url", "targetSlug", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('tmb_d_personal', 'tms_details', '🏠 Shaxsiy hisob', 'MENU', NULL, 'personal', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_d_business', 'tms_details', '💼 Business hisob', 'MENU', NULL, 'business', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_d_app', 'tms_details', '🌐 Dasturga kirish', 'URL', 'https://balancy.space', NULL, true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_d_back', 'tms_details', '⬅️ Orqaga', 'BACK', NULL, 'welcome', true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_p_app', 'tms_personal', '🚀 Dasturga kirish', 'URL', 'https://balancy.space', NULL, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_p_back', 'tms_personal', '⬅️ Orqaga', 'BACK', NULL, 'details', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_b_furniture', 'tms_business', '🪑 Mebel do‘koni', 'MENU', NULL, 'furniture', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_b_carpet', 'tms_business', '🧶 Gilam do‘koni', 'MENU', NULL, 'carpet', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_b_other', 'tms_business', '📦 Boshqa biznes', 'MENU', NULL, 'other', true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_b_back', 'tms_business', '⬅️ Orqaga', 'BACK', NULL, 'details', true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_f_app', 'tms_furniture', '🚀 Dasturga kirish', 'URL', 'https://balancy.space', NULL, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_f_back', 'tms_furniture', '⬅️ Orqaga', 'BACK', NULL, 'business', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_c_app', 'tms_carpet', '🚀 Dasturga kirish', 'URL', 'https://balancy.space', NULL, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_c_back', 'tms_carpet', '⬅️ Orqaga', 'BACK', NULL, 'business', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_o_app', 'tms_other', '🚀 Dasturga kirish', 'URL', 'https://balancy.space', NULL, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tmb_o_back', 'tms_other', '⬅️ Orqaga', 'BACK', NULL, 'business', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "telegram_automations"
  ("id", "kind", "enabled", "hour", "minute", "timezone", "weekday", "monthDay", "ctaLabel", "ctaPath", "createdAt", "updatedAt")
VALUES
  ('tga_p_morning', 'PERSONAL_MORNING', false, 8, 0, 'Asia/Tashkent', NULL, NULL, '📊 Natijalarni ko‘rish', '/personal/dashboard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tga_p_evening', 'PERSONAL_EVENING', false, 21, 0, 'Asia/Tashkent', NULL, NULL, '📊 Natijalarni ko‘rish', '/personal/dashboard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tga_p_weekly', 'PERSONAL_WEEKLY', false, 20, 0, 'Asia/Tashkent', 1, NULL, '📊 Natijalarni ko‘rish', '/personal/analytics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tga_p_monthly', 'PERSONAL_MONTHLY', false, 20, 0, 'Asia/Tashkent', NULL, 1, '📊 Natijalarni ko‘rish', '/personal/analytics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tga_b_morning', 'BUSINESS_MORNING', false, 8, 0, 'Asia/Tashkent', NULL, NULL, '📊 Natijalarni ko‘rish', '/dashboard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tga_b_evening', 'BUSINESS_EVENING', false, 21, 0, 'Asia/Tashkent', NULL, NULL, '📊 Natijalarni ko‘rish', '/dashboard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tga_b_weekly', 'BUSINESS_WEEKLY', false, 20, 0, 'Asia/Tashkent', 1, NULL, '📊 Natijalarni ko‘rish', '/reports', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tga_b_monthly', 'BUSINESS_MONTHLY', false, 20, 0, 'Asia/Tashkent', NULL, 1, '📊 Natijalarni ko‘rish', '/reports', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("kind") DO NOTHING;
