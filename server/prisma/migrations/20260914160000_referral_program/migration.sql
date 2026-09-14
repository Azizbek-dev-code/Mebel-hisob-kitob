-- Referral program. Isolated from PersonalEntry, store Sale/Expense, and PlatformExpense.
-- Does not rewrite old migrations. Does not mix ledgers.

DO $$ BEGIN
  CREATE TYPE "ReferralCommissionStatus" AS ENUM ('PENDING', 'AVAILABLE', 'WITHDRAW_REQUESTED', 'PAID', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReferralWithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "referralCommissionPercent" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "referralMinWithdrawalSom" BIGINT NOT NULL DEFAULT 100000;
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "referralProgramActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "referral_codes" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_identityId_key" ON "referral_codes"("identityId");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_code_key" ON "referral_codes"("code");

CREATE TABLE IF NOT EXISTS "referral_clicks" (
  "id" TEXT NOT NULL,
  "referralCodeId" TEXT NOT NULL,
  "visitorKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_clicks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "referral_clicks_referralCodeId_createdAt_idx" ON "referral_clicks"("referralCodeId", "createdAt");
CREATE INDEX IF NOT EXISTS "referral_clicks_visitorKey_referralCodeId_idx" ON "referral_clicks"("visitorKey", "referralCodeId");

CREATE TABLE IF NOT EXISTS "referral_attributions" (
  "id" TEXT NOT NULL,
  "referralCodeId" TEXT NOT NULL,
  "referrerIdentityId" TEXT NOT NULL,
  "referredIdentityId" TEXT NOT NULL,
  "referredWorkspaceId" TEXT,
  "visitorKey" TEXT,
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accountCreatedAt" TIMESTAMP(3),
  "firstPaidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_attributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "referral_attributions_referredIdentityId_key" ON "referral_attributions"("referredIdentityId");
CREATE INDEX IF NOT EXISTS "referral_attributions_referrerIdentityId_idx" ON "referral_attributions"("referrerIdentityId");

CREATE TABLE IF NOT EXISTS "referral_withdrawals" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "amountSom" BIGINT NOT NULL,
  "status" "ReferralWithdrawalStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "referral_withdrawals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "referral_withdrawals_identityId_status_idx" ON "referral_withdrawals"("identityId", "status");
CREATE INDEX IF NOT EXISTS "referral_withdrawals_status_createdAt_idx" ON "referral_withdrawals"("status", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "referral_withdrawals_one_open_per_identity"
  ON "referral_withdrawals"("identityId")
  WHERE "status" IN ('PENDING', 'APPROVED');

CREATE TABLE IF NOT EXISTS "referral_commissions" (
  "id" TEXT NOT NULL,
  "attributionId" TEXT NOT NULL,
  "referrerIdentityId" TEXT NOT NULL,
  "amountSom" BIGINT NOT NULL,
  "commissionPercent" INTEGER NOT NULL,
  "sourceAmountSom" BIGINT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "status" "ReferralCommissionStatus" NOT NULL DEFAULT 'AVAILABLE',
  "withdrawalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "referral_commissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "referral_commissions_attributionId_key" ON "referral_commissions"("attributionId");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_commissions_sourceType_sourceId_key" ON "referral_commissions"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "referral_commissions_referrerIdentityId_status_idx" ON "referral_commissions"("referrerIdentityId", "status");

DO $$ BEGIN
  ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral_clicks" ADD CONSTRAINT "referral_clicks_referralCodeId_fkey"
    FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referralCodeId_fkey"
    FOREIGN KEY ("referralCodeId") REFERENCES "referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referredIdentityId_fkey"
    FOREIGN KEY ("referredIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral_withdrawals" ADD CONSTRAINT "referral_withdrawals_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_attributionId_fkey"
    FOREIGN KEY ("attributionId") REFERENCES "referral_attributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_referrerIdentityId_fkey"
    FOREIGN KEY ("referrerIdentityId") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_withdrawalId_fkey"
    FOREIGN KEY ("withdrawalId") REFERENCES "referral_withdrawals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
