-- Additive: category glyphs, hashed email codes, growth aims.
-- Existing personal_categories rows keep working with NULL icon (UI maps by key).

ALTER TABLE "personal_categories" ADD COLUMN IF NOT EXISTS "icon" TEXT;

UPDATE "personal_categories" SET "icon" = '💼' WHERE "key" = 'SALARY' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '💻' WHERE "key" = 'FREELANCE' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '🏪' WHERE "key" = 'BUSINESS' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '🎁' WHERE "key" = 'BONUS' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '💰' WHERE "key" = 'INVESTMENT' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '✨' WHERE "key" = 'EXTRA' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '💵' WHERE "key" = 'INCOME_OTHER' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '🍔' WHERE "key" = 'FOOD' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '🚕' WHERE "key" = 'TRANSPORT' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '🏠' WHERE "key" = 'HOME' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '📱' WHERE "key" = 'COMMUNICATION' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '🛒' WHERE "key" = 'SHOPPING' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '💊' WHERE "key" = 'HEALTH' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '🎓' WHERE "key" = 'EDUCATION' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '🎮' WHERE "key" = 'FUN' AND ("icon" IS NULL OR "icon" = '');
UPDATE "personal_categories" SET "icon" = '📦' WHERE "key" = 'EXPENSE_OTHER' AND ("icon" IS NULL OR "icon" = '');

CREATE TABLE IF NOT EXISTS "auth_email_codes" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "newEmail" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "identityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_email_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "auth_email_codes_email_purpose_createdAt_idx"
  ON "auth_email_codes"("email", "purpose", "createdAt");

CREATE INDEX IF NOT EXISTS "auth_email_codes_expiresAt_idx"
  ON "auth_email_codes"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "auth_email_codes"
    ADD CONSTRAINT "auth_email_codes_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "identities"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "growth_aims" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "targetDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "growth_aims_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "growth_aims_workspaceId_status_createdAt_idx"
  ON "growth_aims"("workspaceId", "status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "growth_aims"
    ADD CONSTRAINT "growth_aims_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
