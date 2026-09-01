-- Separate Installer haqqi from Usta (installationCost / assemblerFee).
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "installerFee" BIGINT NOT NULL DEFAULT 0;
