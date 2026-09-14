-- Additive catalog for Store / request verticals, plus linking a request to an Identity.
-- Existing stores stay FURNITURE. Does not rewrite old migrations or touch ERP/Personal tables.

DO $$ BEGIN
  ALTER TYPE "BusinessType" ADD VALUE 'CARPET';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "BusinessType" ADD VALUE 'CLOTHING';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "BusinessType" ADD VALUE 'ELECTRONICS';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "BusinessType" ADD VALUE 'OTHER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "store_creation_requests"
  ADD COLUMN IF NOT EXISTS "businessType" "BusinessType" NOT NULL DEFAULT 'FURNITURE';

ALTER TABLE "store_creation_requests"
  ADD COLUMN IF NOT EXISTS "identityId" TEXT;

DO $$ BEGIN
  ALTER TABLE "store_creation_requests"
    ADD CONSTRAINT "store_creation_requests_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "store_creation_requests_identityId_idx"
  ON "store_creation_requests"("identityId");
