-- Public store-creation applications (platform-level, not store-scoped until
-- approval links createdStoreId). Existing stores and users are untouched.

CREATE TYPE "StoreCreationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "store_creation_requests" (
    "id" TEXT NOT NULL,
    "applicantFirstName" TEXT NOT NULL,
    "applicantLastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "storeName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "StoreCreationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdStoreId" TEXT,
    "createdUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_creation_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "store_creation_requests_status_createdAt_idx" ON "store_creation_requests"("status", "createdAt");
CREATE INDEX "store_creation_requests_phone_status_idx" ON "store_creation_requests"("phone", "status");
CREATE INDEX "store_creation_requests_email_status_idx" ON "store_creation_requests"("email", "status");
CREATE INDEX "store_creation_requests_username_status_idx" ON "store_creation_requests"("username", "status");
CREATE INDEX "store_creation_requests_createdStoreId_idx" ON "store_creation_requests"("createdStoreId");

ALTER TABLE "store_creation_requests" ADD CONSTRAINT "store_creation_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "store_creation_requests" ADD CONSTRAINT "store_creation_requests_createdStoreId_fkey" FOREIGN KEY ("createdStoreId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "store_creation_requests" ADD CONSTRAINT "store_creation_requests_createdUserId_fkey" FOREIGN KEY ("createdUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Platform-level audit rows (store-creation requested) have no store yet.
ALTER TABLE "audit_logs" ALTER COLUMN "storeId" DROP NOT NULL;
