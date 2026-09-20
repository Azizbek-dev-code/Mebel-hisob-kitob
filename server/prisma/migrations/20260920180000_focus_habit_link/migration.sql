-- Link Pomodoro/focus sessions to a habit without rewriting existing rows.
ALTER TABLE "growth_focus_sessions"
  ADD COLUMN IF NOT EXISTS "habitId" TEXT;

CREATE INDEX IF NOT EXISTS "growth_focus_sessions_habitId_idx"
  ON "growth_focus_sessions"("habitId");

DO $$ BEGIN
  ALTER TABLE "growth_focus_sessions"
    ADD CONSTRAINT "growth_focus_sessions_habitId_fkey"
    FOREIGN KEY ("habitId") REFERENCES "growth_habits"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
