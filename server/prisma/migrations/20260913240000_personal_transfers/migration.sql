-- Wallet-to-wallet personal transfers. No storeId. Not income/expense.

CREATE TABLE IF NOT EXISTS "personal_transfers" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "fromWalletId" TEXT NOT NULL,
  "toWalletId" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "status" "ExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "personal_transfers_distinct_wallets" CHECK ("fromWalletId" <> "toWalletId")
);

CREATE INDEX IF NOT EXISTS "personal_transfers_workspaceId_occurredAt_idx"
  ON "personal_transfers"("workspaceId", "occurredAt");
CREATE INDEX IF NOT EXISTS "personal_transfers_workspaceId_status_idx"
  ON "personal_transfers"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "personal_transfers_fromWalletId_idx"
  ON "personal_transfers"("fromWalletId");
CREATE INDEX IF NOT EXISTS "personal_transfers_toWalletId_idx"
  ON "personal_transfers"("toWalletId");

ALTER TABLE "personal_transfers" DROP CONSTRAINT IF EXISTS "personal_transfers_workspaceId_fkey";
ALTER TABLE "personal_transfers"
  ADD CONSTRAINT "personal_transfers_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "personal_transfers" DROP CONSTRAINT IF EXISTS "personal_transfers_fromWalletId_fkey";
ALTER TABLE "personal_transfers"
  ADD CONSTRAINT "personal_transfers_fromWalletId_fkey"
  FOREIGN KEY ("fromWalletId") REFERENCES "personal_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "personal_transfers" DROP CONSTRAINT IF EXISTS "personal_transfers_toWalletId_fkey";
ALTER TABLE "personal_transfers"
  ADD CONSTRAINT "personal_transfers_toWalletId_fkey"
  FOREIGN KEY ("toWalletId") REFERENCES "personal_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
