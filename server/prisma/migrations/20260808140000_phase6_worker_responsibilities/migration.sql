-- Phase 6: worker responsibilities + activity history
-- Applied via `prisma db push` during development; this SQL documents the delta
-- for environments that use `prisma migrate deploy`.

DO $$ BEGIN
  CREATE TYPE "WorkerResponsibility" AS ENUM (
    'SELLER',
    'ASSEMBLER',
    'DELIVERY',
    'INSTALLER',
    'SMM',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkerActivityType" AS ENUM (
    'WORKER_CREATED',
    'WORKER_UPDATED',
    'WORKER_ACTIVATED',
    'WORKER_DEACTIVATED',
    'PASSWORD_RESET',
    'SALE_CREATED',
    'ASSEMBLY_ASSIGNED',
    'ASSEMBLY_STARTED',
    'ASSEMBLY_COMPLETED',
    'PAYMENT_RECORDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE TABLE IF NOT EXISTS "user_responsibilities" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "responsibility" "WorkerResponsibility" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_responsibilities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_responsibilities_userId_responsibility_key"
  ON "user_responsibilities"("userId", "responsibility");

CREATE INDEX IF NOT EXISTS "user_responsibilities_storeId_responsibility_idx"
  ON "user_responsibilities"("storeId", "responsibility");

CREATE INDEX IF NOT EXISTS "user_responsibilities_storeId_userId_idx"
  ON "user_responsibilities"("storeId", "userId");

DO $$ BEGIN
  ALTER TABLE "user_responsibilities"
    ADD CONSTRAINT "user_responsibilities_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_responsibilities"
    ADD CONSTRAINT "user_responsibilities_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "worker_activities" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "WorkerActivityType" NOT NULL,
  "relatedSaleId" TEXT,
  "relatedTaskId" TEXT,
  "relatedPaymentId" TEXT,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "worker_activities_storeId_workerId_createdAt_idx"
  ON "worker_activities"("storeId", "workerId", "createdAt");

CREATE INDEX IF NOT EXISTS "worker_activities_storeId_createdAt_idx"
  ON "worker_activities"("storeId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "worker_activities"
    ADD CONSTRAINT "worker_activities_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "worker_activities"
    ADD CONSTRAINT "worker_activities_workerId_fkey"
    FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "worker_activities"
    ADD CONSTRAINT "worker_activities_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
