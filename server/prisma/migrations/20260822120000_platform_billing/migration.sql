-- Platform billing: plans, subscriptions, invoices, expenses, settings, store access.

CREATE TYPE "StoreAccessStatus" AS ENUM ('ACTIVE', 'PAYMENT_BLOCKED', 'MANUALLY_BLOCKED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'BLOCKED', 'CANCELLED');
CREATE TYPE "PlatformBillingStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "PlatformPaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER');
CREATE TYPE "PlatformExpenseCategory" AS ENUM ('SERVER', 'HOSTING', 'DOMAIN', 'SMS', 'EMAIL', 'SOFTWARE', 'ADVERTISING', 'MARKETING', 'DEVELOPMENT', 'OTHER');
CREATE TYPE "PlatformExpenseStatus" AS ENUM ('ACTIVE', 'CANCELLED');
CREATE TYPE "PlatformBillingCycle" AS ENUM ('MONTHLY');

ALTER TABLE "stores" ADD COLUMN "accessStatus" "StoreAccessStatus" NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX "stores_accessStatus_idx" ON "stores"("accessStatus");

CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "monthlyPrice" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "features" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");
CREATE INDEX "subscription_plans_isActive_idx" ON "subscription_plans"("isActive");

CREATE TABLE "store_subscriptions" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "nextPaymentDue" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "pendingPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "store_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "store_subscriptions_storeId_key" ON "store_subscriptions"("storeId");
CREATE INDEX "store_subscriptions_status_nextPaymentDue_idx" ON "store_subscriptions"("status", "nextPaymentDue");
CREATE INDEX "store_subscriptions_planId_idx" ON "store_subscriptions"("planId");

CREATE TABLE "platform_invoices" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "PlatformBillingStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" "PlatformPaymentMethod",
    "reference" TEXT,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_invoices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "platform_invoices_subscriptionId_billingPeriodStart_key" ON "platform_invoices"("subscriptionId", "billingPeriodStart");
CREATE INDEX "platform_invoices_storeId_status_dueDate_idx" ON "platform_invoices"("storeId", "status", "dueDate");
CREATE INDEX "platform_invoices_status_dueDate_idx" ON "platform_invoices"("status", "dueDate");
CREATE INDEX "platform_invoices_paidAt_idx" ON "platform_invoices"("paidAt");

CREATE TABLE "platform_expenses" (
    "id" TEXT NOT NULL,
    "category" "PlatformExpenseCategory" NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "vendor" TEXT,
    "reference" TEXT,
    "status" "PlatformExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "platform_expenses_status_date_idx" ON "platform_expenses"("status", "date");
CREATE INDEX "platform_expenses_category_date_idx" ON "platform_expenses"("category", "date");

CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "platformName" TEXT NOT NULL DEFAULT 'Furniture ERP',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'UZS',
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 3,
    "billingCycle" "PlatformBillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "paymentRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderDaysBeforeDue" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_pendingPlanId_fkey" FOREIGN KEY ("pendingPlanId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "store_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "platform_expenses" ADD CONSTRAINT "platform_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_expenses" ADD CONSTRAINT "platform_expenses_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
