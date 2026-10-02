-- Additive: SMM Agency project commercial layer (clients, goals, budget lines, contract fields).
-- No drops of existing columns. Safe to deploy with `prisma migrate deploy`.

-- CreateEnum
CREATE TYPE "SmmContractType" AS ENUM ('RETAINER', 'PROJECT', 'HYBRID');

-- CreateEnum
CREATE TYPE "SmmPaymentSchedule" AS ENUM ('MONTHLY', 'FULL_UPFRONT', 'FIFTY_FIFTY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SmmBudgetLineCategory" AS ENUM ('EMPLOYEE', 'PRODUCTION', 'ADVERTISING', 'TRANSPORT', 'EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SmmDeliverableMode" AS ENUM ('TOTAL', 'FREQUENCY');

-- CreateEnum
CREATE TYPE "SmmGoalKind" AS ENUM ('BRAND_AWARENESS', 'REACH', 'FOLLOWERS', 'LEADS', 'SALES', 'ENGAGEMENT', 'TRAFFIC', 'CONTENT_PRODUCTION', 'COMMUNITY_GROWTH', 'CUSTOM');

-- CreateTable
CREATE TABLE "smm_clients" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "telegram" TEXT,
    "instagram" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_project_goals" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "SmmGoalKind" NOT NULL,
    "customLabel" TEXT,
    "currentValue" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "periodLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_project_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_project_budget_lines" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "SmmBudgetLineCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "plannedAmount" BIGINT NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_project_budget_lines_pkey" PRIMARY KEY ("id")
);

-- AlterTable smm_projects (additive nullable commercial columns)
ALTER TABLE "smm_projects" ADD COLUMN "clientId" TEXT,
ADD COLUMN "managerUserId" TEXT,
ADD COLUMN "direction" TEXT,
ADD COLUMN "platforms" JSONB,
ADD COLUMN "contractType" "SmmContractType",
ADD COLUMN "contractStart" TIMESTAMP(3),
ADD COLUMN "contractEnd" TIMESTAMP(3),
ADD COLUMN "autoRenew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "clientFee" BIGINT,
ADD COLUMN "paymentSchedule" "SmmPaymentSchedule",
ADD COLUMN "paymentStatus" TEXT,
ADD COLUMN "internalBudgetPlanned" BIGINT,
ADD COLUMN "adBudgetPlanned" BIGINT,
ADD COLUMN "adBudgetPeriod" TEXT,
ADD COLUMN "adPlatforms" JSONB,
ADD COLUMN "expectedResults" JSONB,
ADD COLUMN "deliverableMode" "SmmDeliverableMode",
ADD COLUMN "deliverables" JSONB,
ADD COLUMN "deliverableFrequency" JSONB;

-- AlterTable smm_project_members
ALTER TABLE "smm_project_members" ADD COLUMN "responsibility" TEXT,
ADD COLUMN "estimatedHours" DOUBLE PRECISION;

-- Indexes
CREATE INDEX "smm_clients_storeId_companyName_idx" ON "smm_clients"("storeId", "companyName");
CREATE INDEX "smm_clients_storeId_archivedAt_idx" ON "smm_clients"("storeId", "archivedAt");
CREATE INDEX "smm_clients_createdById_idx" ON "smm_clients"("createdById");

CREATE INDEX "smm_projects_clientId_idx" ON "smm_projects"("clientId");
CREATE INDEX "smm_projects_managerUserId_idx" ON "smm_projects"("managerUserId");

CREATE INDEX "smm_project_goals_projectId_sortOrder_idx" ON "smm_project_goals"("projectId", "sortOrder");
CREATE INDEX "smm_project_budget_lines_projectId_sortOrder_idx" ON "smm_project_budget_lines"("projectId", "sortOrder");
CREATE INDEX "smm_project_budget_lines_projectId_category_idx" ON "smm_project_budget_lines"("projectId", "category");

-- ForeignKeys
ALTER TABLE "smm_clients" ADD CONSTRAINT "smm_clients_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "smm_clients" ADD CONSTRAINT "smm_clients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "smm_projects" ADD CONSTRAINT "smm_projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "smm_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "smm_projects" ADD CONSTRAINT "smm_projects_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "smm_project_goals" ADD CONSTRAINT "smm_project_goals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "smm_project_budget_lines" ADD CONSTRAINT "smm_project_budget_lines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "smm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
