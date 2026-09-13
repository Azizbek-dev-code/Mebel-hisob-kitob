-- AlterTable
ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_storeId_deletedAt_idx" ON "users"("storeId", "deletedAt");

-- CreateTable
CREATE TABLE "account_deletions" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "userId" TEXT,
    "emailSnapshot" TEXT NOT NULL,
    "usernameSnapshot" TEXT,
    "fullNameSnapshot" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "reasonDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_deletions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_deletions_createdAt_idx" ON "account_deletions"("createdAt");

-- CreateIndex
CREATE INDEX "account_deletions_storeId_createdAt_idx" ON "account_deletions"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "account_deletions_reasonCode_idx" ON "account_deletions"("reasonCode");

-- AddForeignKey
ALTER TABLE "account_deletions" ADD CONSTRAINT "account_deletions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_deletions" ADD CONSTRAINT "account_deletions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
