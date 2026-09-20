-- Forward-only V2 production safety.
-- Additive indexes + disable never-run seed automations so first deploy does not spam.

UPDATE "telegram_automations"
SET "enabled" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('tga_p_morning', 'tga_b_morning')
  AND "lastRunAt" IS NULL;

CREATE INDEX IF NOT EXISTS "identity_presence_lastActivityAt_idx"
  ON "identity_presence"("lastActivityAt");

CREATE INDEX IF NOT EXISTS "growth_progress_totalXp_idx"
  ON "growth_progress"("totalXp");

CREATE INDEX IF NOT EXISTS "growth_xp_events_identityId_createdAt_idx"
  ON "growth_xp_events"("identityId", "createdAt");
