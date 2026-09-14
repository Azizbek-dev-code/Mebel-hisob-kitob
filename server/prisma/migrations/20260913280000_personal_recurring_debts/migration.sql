-- Recurring reminders, person-to-person debts, notification prefs.
-- No storeId. Not Sale / customer debt / store Expense.

DO $$ BEGIN
  CREATE TYPE "PersonalRecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PersonalDebtDirection" AS ENUM ('LENT', 'BORROWED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "personal_profiles"
  ADD COLUMN IF NOT EXISTS "notifyBudget" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyGoals" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyRecurring" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "notifyDebts" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "personal_recurring_rules" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "PersonalEntryType" NOT NULL,
  "amountSom" BIGINT NOT NULL,
  "frequency" "PersonalRecurringFrequency" NOT NULL,
  "intervalDays" INTEGER,
  "dayOfMonth" INTEGER,
  "nextDueAt" TIMESTAMP(3) NOT NULL,
  "walletId" TEXT,
  "categoryId" TEXT,
  "note" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_recurring_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "personal_recurring_rules_workspaceId_isActive_nextDueAt_idx"
  ON "personal_recurring_rules"("workspaceId", "isActive", "nextDueAt");

ALTER TABLE "personal_recurring_rules" DROP CONSTRAINT IF EXISTS "personal_recurring_rules_workspaceId_fkey";
ALTER TABLE "personal_recurring_rules"
  ADD CONSTRAINT "personal_recurring_rules_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "personal_recurring_rules" DROP CONSTRAINT IF EXISTS "personal_recurring_rules_walletId_fkey";
ALTER TABLE "personal_recurring_rules"
  ADD CONSTRAINT "personal_recurring_rules_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "personal_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "personal_recurring_rules" DROP CONSTRAINT IF EXISTS "personal_recurring_rules_categoryId_fkey";
ALTER TABLE "personal_recurring_rules"
  ADD CONSTRAINT "personal_recurring_rules_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "personal_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "personal_debts" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "direction" "PersonalDebtDirection" NOT NULL,
  "personName" TEXT NOT NULL,
  "principalSom" BIGINT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "dueAt" TIMESTAMP(3),
  "note" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_debts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "personal_debts_workspaceId_isArchived_idx"
  ON "personal_debts"("workspaceId", "isArchived");

ALTER TABLE "personal_debts" DROP CONSTRAINT IF EXISTS "personal_debts_workspaceId_fkey";
ALTER TABLE "personal_debts"
  ADD CONSTRAINT "personal_debts_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "personal_debt_payments" (
  "id" TEXT NOT NULL,
  "debtId" TEXT NOT NULL,
  "amountSom" BIGINT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "personal_debt_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "personal_debt_payments_debtId_occurredAt_idx"
  ON "personal_debt_payments"("debtId", "occurredAt");

ALTER TABLE "personal_debt_payments" DROP CONSTRAINT IF EXISTS "personal_debt_payments_debtId_fkey";
ALTER TABLE "personal_debt_payments"
  ADD CONSTRAINT "personal_debt_payments_debtId_fkey"
  FOREIGN KEY ("debtId") REFERENCES "personal_debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
