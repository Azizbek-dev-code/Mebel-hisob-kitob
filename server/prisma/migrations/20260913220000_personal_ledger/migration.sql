-- Personal Finance ledger. No storeId.

DO $$ BEGIN
  CREATE TYPE "PersonalWalletKind" AS ENUM ('CASH', 'CARD', 'BANK', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PersonalCategoryKind" AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PersonalEntryType" AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "personal_wallets" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "PersonalWalletKind" NOT NULL,
  "openingBalanceSom" BIGINT NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_wallets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "personal_wallets_workspaceId_name_key"
  ON "personal_wallets"("workspaceId", "name");
CREATE INDEX IF NOT EXISTS "personal_wallets_workspaceId_isArchived_idx"
  ON "personal_wallets"("workspaceId", "isArchived");

ALTER TABLE "personal_wallets" DROP CONSTRAINT IF EXISTS "personal_wallets_workspaceId_fkey";
ALTER TABLE "personal_wallets"
  ADD CONSTRAINT "personal_wallets_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "personal_categories" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "kind" "PersonalCategoryKind" NOT NULL,
  "key" TEXT,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT 'slate',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "personal_categories_workspaceId_kind_name_key"
  ON "personal_categories"("workspaceId", "kind", "name");
CREATE INDEX IF NOT EXISTS "personal_categories_workspaceId_kind_isActive_idx"
  ON "personal_categories"("workspaceId", "kind", "isActive");

ALTER TABLE "personal_categories" DROP CONSTRAINT IF EXISTS "personal_categories_workspaceId_fkey";
ALTER TABLE "personal_categories"
  ADD CONSTRAINT "personal_categories_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "personal_entries" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "type" "PersonalEntryType" NOT NULL,
  "amount" BIGINT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "status" "ExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "personal_entries_workspaceId_occurredAt_idx"
  ON "personal_entries"("workspaceId", "occurredAt");
CREATE INDEX IF NOT EXISTS "personal_entries_workspaceId_type_status_idx"
  ON "personal_entries"("workspaceId", "type", "status");
CREATE INDEX IF NOT EXISTS "personal_entries_walletId_idx"
  ON "personal_entries"("walletId");
CREATE INDEX IF NOT EXISTS "personal_entries_categoryId_idx"
  ON "personal_entries"("categoryId");

ALTER TABLE "personal_entries" DROP CONSTRAINT IF EXISTS "personal_entries_workspaceId_fkey";
ALTER TABLE "personal_entries"
  ADD CONSTRAINT "personal_entries_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "personal_entries" DROP CONSTRAINT IF EXISTS "personal_entries_walletId_fkey";
ALTER TABLE "personal_entries"
  ADD CONSTRAINT "personal_entries_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "personal_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "personal_entries" DROP CONSTRAINT IF EXISTS "personal_entries_categoryId_fkey";
ALTER TABLE "personal_entries"
  ADD CONSTRAINT "personal_entries_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "personal_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
