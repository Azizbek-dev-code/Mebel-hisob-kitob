-- PostgreSQL treats unquoted `rank` as an ordered-set aggregate (WITHIN GROUP).
-- Prisma selects can hit: "WITHIN GROUP is required for ordered-set aggregate rank".
-- Rename the physical column; Prisma field stays `rank` via @map("plan_rank").

ALTER TABLE "subscription_plans" RENAME COLUMN "rank" TO "plan_rank";

DROP INDEX IF EXISTS "subscription_plans_audience_rank_idx";

CREATE INDEX IF NOT EXISTS "subscription_plans_audience_plan_rank_idx"
  ON "subscription_plans" ("audience", "plan_rank");
