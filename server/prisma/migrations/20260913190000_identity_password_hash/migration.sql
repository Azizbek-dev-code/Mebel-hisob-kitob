-- Optional password digest for Personal self-registration.
-- Existing Identity rows (ERP backfill) stay NULL; login still uses users.passwordHash.

ALTER TABLE "identities" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
