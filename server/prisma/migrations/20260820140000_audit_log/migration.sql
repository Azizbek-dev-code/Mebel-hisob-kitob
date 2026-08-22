-- Store-scoped audit trail: an immutable, append-only record of who changed what.
--
-- Separate from "worker_activities", which needs a subject worker and answers a
-- different question. Nothing in the application updates or deletes these rows.
--
-- "eventType" and "entityType" are TEXT rather than Postgres enums so that an
-- old row stays readable after the vocabulary has moved on, and so that adding
-- an event never requires a migration against a table that must only be
-- appended to. The accepted values live in shared/src/constants/audit.ts.

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- The audit screen reads newest-first within one store, optionally narrowed by
-- action, by record, or by user; one index per access path.
CREATE INDEX "audit_logs_storeId_createdAt_idx" ON "audit_logs"("storeId", "createdAt");
CREATE INDEX "audit_logs_storeId_eventType_createdAt_idx" ON "audit_logs"("storeId", "eventType", "createdAt");
CREATE INDEX "audit_logs_storeId_entityType_entityId_idx" ON "audit_logs"("storeId", "entityType", "entityId");
CREATE INDEX "audit_logs_storeId_actorUserId_createdAt_idx" ON "audit_logs"("storeId", "actorUserId", "createdAt");

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SET NULL, not CASCADE: deleting a user must not erase the record of what they did.
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
