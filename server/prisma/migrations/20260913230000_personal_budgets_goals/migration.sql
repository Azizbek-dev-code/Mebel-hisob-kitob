-- Personal budgets and saving goals. No storeId.

DO $$ BEGIN
  CREATE TYPE "PersonalBudgetKind" AS ENUM ('TOTAL', 'CATEGORY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PersonalSavingGoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "personal_budgets" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "kind" "PersonalBudgetKind" NOT NULL,
  "categoryId" TEXT,
  "name" TEXT NOT NULL,
  "limitSom" BIGINT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_budgets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "personal_budgets_workspaceId_isActive_idx"
  ON "personal_budgets"("workspaceId", "isActive");
CREATE INDEX IF NOT EXISTS "personal_budgets_categoryId_idx"
  ON "personal_budgets"("categoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "personal_budgets_workspace_total_active_key"
  ON "personal_budgets"("workspaceId")
  WHERE "kind" = 'TOTAL' AND "isActive" = true;
CREATE UNIQUE INDEX IF NOT EXISTS "personal_budgets_workspace_category_active_key"
  ON "personal_budgets"("workspaceId", "categoryId")
  WHERE "kind" = 'CATEGORY' AND "isActive" = true;

ALTER TABLE "personal_budgets" DROP CONSTRAINT IF EXISTS "personal_budgets_workspaceId_fkey";
ALTER TABLE "personal_budgets"
  ADD CONSTRAINT "personal_budgets_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "personal_budgets" DROP CONSTRAINT IF EXISTS "personal_budgets_categoryId_fkey";
ALTER TABLE "personal_budgets"
  ADD CONSTRAINT "personal_budgets_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "personal_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "personal_saving_goals" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "targetAmountSom" BIGINT NOT NULL,
  "targetDate" TIMESTAMP(3),
  "status" "PersonalSavingGoalStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "personal_saving_goals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "personal_saving_goals_workspaceId_status_idx"
  ON "personal_saving_goals"("workspaceId", "status");

ALTER TABLE "personal_saving_goals" DROP CONSTRAINT IF EXISTS "personal_saving_goals_workspaceId_fkey";
ALTER TABLE "personal_saving_goals"
  ADD CONSTRAINT "personal_saving_goals_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "personal_goal_contributions" (
  "id" TEXT NOT NULL,
  "goalId" TEXT NOT NULL,
  "amountSom" BIGINT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "personal_goal_contributions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "personal_goal_contributions_goalId_occurredAt_idx"
  ON "personal_goal_contributions"("goalId", "occurredAt");

ALTER TABLE "personal_goal_contributions" DROP CONSTRAINT IF EXISTS "personal_goal_contributions_goalId_fkey";
ALTER TABLE "personal_goal_contributions"
  ADD CONSTRAINT "personal_goal_contributions_goalId_fkey"
  FOREIGN KEY ("goalId") REFERENCES "personal_saving_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
