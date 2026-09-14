-- Additive vertical on stores. Existing rows default to FURNITURE.
-- Does not touch Sale / Purchase / PersonalEntry tables.

DO $$ BEGIN
  CREATE TYPE "BusinessType" AS ENUM ('FURNITURE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "businessType" "BusinessType" NOT NULL DEFAULT 'FURNITURE';

CREATE INDEX IF NOT EXISTS "stores_businessType_idx" ON "stores"("businessType");
