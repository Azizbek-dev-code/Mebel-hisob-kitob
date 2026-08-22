-- Inventory stock foundation: on-hand quantity on products + append-only movements.

DO $$ BEGIN
  CREATE TYPE "StockMovementType" AS ENUM (
    'PURCHASE',
    'SALE',
    'SALE_CANCEL',
    'MANUAL_IN',
    'MANUAL_OUT',
    'ADJUSTMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StockReferenceType" AS ENUM (
    'SALE',
    'MANUAL',
    'PURCHASE',
    'ADJUSTMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stockQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "minStockQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "trackStock" BOOLEAN NOT NULL DEFAULT true;

-- Existing catalog rows had no inventory history. Keep sales working by leaving
-- them untracked until an admin records the first stock-in (which enables tracking).
UPDATE "products"
SET "trackStock" = false
WHERE "stockQty" = 0
  AND NOT EXISTS (
    SELECT 1 FROM "stock_movements" sm WHERE sm."productId" = "products"."id"
  );

CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "referenceType" "StockReferenceType",
    "referenceId" TEXT,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "products_storeId_trackStock_stockQty_idx"
  ON "products"("storeId", "trackStock", "stockQty");

CREATE INDEX IF NOT EXISTS "stock_movements_storeId_createdAt_idx"
  ON "stock_movements"("storeId", "createdAt");

CREATE INDEX IF NOT EXISTS "stock_movements_storeId_productId_createdAt_idx"
  ON "stock_movements"("storeId", "productId", "createdAt");

CREATE INDEX IF NOT EXISTS "stock_movements_storeId_movementType_idx"
  ON "stock_movements"("storeId", "movementType");

CREATE INDEX IF NOT EXISTS "stock_movements_storeId_referenceType_referenceId_idx"
  ON "stock_movements"("storeId", "referenceType", "referenceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_storeId_fkey'
  ) THEN
    ALTER TABLE "stock_movements"
      ADD CONSTRAINT "stock_movements_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "stores"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_productId_fkey'
  ) THEN
    ALTER TABLE "stock_movements"
      ADD CONSTRAINT "stock_movements_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_createdById_fkey'
  ) THEN
    ALTER TABLE "stock_movements"
      ADD CONSTRAINT "stock_movements_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
