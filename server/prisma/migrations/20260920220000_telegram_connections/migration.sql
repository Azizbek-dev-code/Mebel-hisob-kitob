-- Telegram account linking + channel preferences (additive, non-destructive).

CREATE TABLE "telegram_connections" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "notifyBusiness" BOOLEAN NOT NULL DEFAULT true,
    "notifyPersonal" BOOLEAN NOT NULL DEFAULT true,
    "bizNotifySales" BOOLEAN NOT NULL DEFAULT true,
    "bizNotifyInventory" BOOLEAN NOT NULL DEFAULT true,
    "bizNotifyDelivery" BOOLEAN NOT NULL DEFAULT true,
    "bizNotifyAssembly" BOOLEAN NOT NULL DEFAULT true,
    "bizNotifyWorkers" BOOLEAN NOT NULL DEFAULT true,
    "bizNotifyBilling" BOOLEAN NOT NULL DEFAULT true,
    "bizNotifyImportant" BOOLEAN NOT NULL DEFAULT true,
    "personalNotifyBudget" BOOLEAN NOT NULL DEFAULT true,
    "personalNotifyGoals" BOOLEAN NOT NULL DEFAULT true,
    "personalNotifyRecurring" BOOLEAN NOT NULL DEFAULT true,
    "personalNotifyDebts" BOOLEAN NOT NULL DEFAULT true,
    "notifyDailySummaryBusiness" BOOLEAN NOT NULL DEFAULT true,
    "notifyDailySummaryPersonal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telegram_link_tokens" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "telegram_pending_links" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_pending_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_connections_identityId_key" ON "telegram_connections"("identityId");
CREATE UNIQUE INDEX "telegram_connections_telegramUserId_key" ON "telegram_connections"("telegramUserId");
CREATE INDEX "telegram_connections_telegramChatId_idx" ON "telegram_connections"("telegramChatId");
CREATE INDEX "telegram_connections_isActive_idx" ON "telegram_connections"("isActive");

CREATE UNIQUE INDEX "telegram_link_tokens_tokenHash_key" ON "telegram_link_tokens"("tokenHash");
CREATE INDEX "telegram_link_tokens_identityId_expiresAt_idx" ON "telegram_link_tokens"("identityId", "expiresAt");
CREATE INDEX "telegram_link_tokens_expiresAt_idx" ON "telegram_link_tokens"("expiresAt");

CREATE INDEX "telegram_pending_links_telegramUserId_expiresAt_idx" ON "telegram_pending_links"("telegramUserId", "expiresAt");
CREATE INDEX "telegram_pending_links_tokenHash_idx" ON "telegram_pending_links"("tokenHash");
CREATE INDEX "telegram_pending_links_expiresAt_idx" ON "telegram_pending_links"("expiresAt");

ALTER TABLE "telegram_connections" ADD CONSTRAINT "telegram_connections_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_link_tokens" ADD CONSTRAINT "telegram_link_tokens_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_pending_links" ADD CONSTRAINT "telegram_pending_links_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
