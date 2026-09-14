-- Additive Identity + Workspace overlay. Does not rewrite Store/User tenancy
-- or StoreSubscription. Login still authenticates against users.

DO $$ BEGIN
  CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'BUSINESS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkspaceMembershipRole" AS ENUM ('OWNER', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "identities" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "identities_email_idx" ON "identities"("email");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "identityId" TEXT;

CREATE INDEX IF NOT EXISTS "users_identityId_idx" ON "users"("identityId");

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_identityId_fkey";
ALTER TABLE "users"
  ADD CONSTRAINT "users_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" TEXT NOT NULL,
  "type" "WorkspaceType" NOT NULL,
  "name" TEXT NOT NULL,
  "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
  "storeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_storeId_key" ON "workspaces"("storeId");
CREATE INDEX IF NOT EXISTS "workspaces_type_status_idx" ON "workspaces"("type", "status");

ALTER TABLE "workspaces" DROP CONSTRAINT IF EXISTS "workspaces_storeId_fkey";
ALTER TABLE "workspaces"
  ADD CONSTRAINT "workspaces_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspaces" DROP CONSTRAINT IF EXISTS "workspaces_business_store_chk";
ALTER TABLE "workspaces"
  ADD CONSTRAINT "workspaces_business_store_chk" CHECK (
    ("type" = 'BUSINESS' AND "storeId" IS NOT NULL)
    OR ("type" = 'PERSONAL' AND "storeId" IS NULL)
  );

CREATE TABLE IF NOT EXISTS "workspace_memberships" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "role" "WorkspaceMembershipRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_memberships_identityId_workspaceId_key"
  ON "workspace_memberships"("identityId", "workspaceId");
CREATE INDEX IF NOT EXISTS "workspace_memberships_workspaceId_idx"
  ON "workspace_memberships"("workspaceId");

ALTER TABLE "workspace_memberships" DROP CONSTRAINT IF EXISTS "workspace_memberships_identityId_fkey";
ALTER TABLE "workspace_memberships"
  ADD CONSTRAINT "workspace_memberships_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_memberships" DROP CONSTRAINT IF EXISTS "workspace_memberships_workspaceId_fkey";
ALTER TABLE "workspace_memberships"
  ADD CONSTRAINT "workspace_memberships_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing production rows: 1 Identity per User (no email merge), 1 BUSINESS
-- workspace per Store. PLATFORM_ADMIN gets an Identity but no membership.
WITH mapped AS (
  SELECT
    u."id" AS "userId",
    gen_random_uuid()::text AS "identityId",
    u."email",
    u."fullName"
  FROM "users" u
  WHERE u."identityId" IS NULL
),
inserted AS (
  INSERT INTO "identities" ("id", "email", "fullName", "createdAt", "updatedAt")
  SELECT "identityId", "email", "fullName", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM mapped
)
UPDATE "users" u
SET "identityId" = mapped."identityId"
FROM mapped
WHERE u."id" = mapped."userId";

INSERT INTO "workspaces" ("id", "type", "name", "status", "storeId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'BUSINESS',
  s."name",
  'ACTIVE',
  s."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "stores" s
WHERE NOT EXISTS (
  SELECT 1 FROM "workspaces" w WHERE w."storeId" = s."id"
);

INSERT INTO "workspace_memberships" ("id", "identityId", "workspaceId", "role", "createdAt")
SELECT
  gen_random_uuid()::text,
  u."identityId",
  w."id",
  CASE
    WHEN u."role" = 'ADMIN' THEN 'OWNER'::"WorkspaceMembershipRole"
    ELSE 'MEMBER'::"WorkspaceMembershipRole"
  END,
  CURRENT_TIMESTAMP
FROM "users" u
JOIN "workspaces" w ON w."storeId" = u."storeId"
WHERE u."identityId" IS NOT NULL
  AND u."role" <> 'PLATFORM_ADMIN'
  AND NOT EXISTS (
    SELECT 1
    FROM "workspace_memberships" m
    WHERE m."identityId" = u."identityId"
      AND m."workspaceId" = w."id"
  );
