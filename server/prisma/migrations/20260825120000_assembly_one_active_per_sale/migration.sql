-- One active assembly assignment per sale (PENDING / IN_PROGRESS).
-- Prevents duplicate "terlash" rows when a sale is edited without changing the usta.
-- Keep the newest active task; cancel older duplicates first.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "saleId"
      ORDER BY "assignedAt" DESC, id DESC
    ) AS rn
  FROM "assembly_tasks"
  WHERE status IN ('PENDING', 'IN_PROGRESS')
)
UPDATE "assembly_tasks"
SET
  status = 'CANCELLED',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "assembly_tasks_one_active_per_sale"
ON "assembly_tasks" ("saleId")
WHERE status IN ('PENDING', 'IN_PROGRESS');
