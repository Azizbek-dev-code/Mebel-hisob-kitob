-- Finance discipline XP source (flat awards — never proportional to money).

DO $$ BEGIN
  ALTER TYPE "GrowthXpSource" ADD VALUE IF NOT EXISTS 'FINANCE_DISCIPLINE';
EXCEPTION
  WHEN others THEN NULL;
END $$;
