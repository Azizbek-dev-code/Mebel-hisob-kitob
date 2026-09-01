-- Purchase delivery details: arrival date, lead days, optional shopir + freight fee.
-- driverFee is purchase-level operational data and does NOT alter item unitCost / totalCost.

ALTER TABLE "purchases" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "purchases" ADD COLUMN "deliveryDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "purchases" ADD COLUMN "driverId" TEXT;
ALTER TABLE "purchases" ADD COLUMN "driverFee" BIGINT NOT NULL DEFAULT 0;

-- Backfill arrival date from purchaseDate for existing rows.
UPDATE "purchases" SET "deliveredAt" = "purchaseDate" WHERE "deliveredAt" IS NULL;

CREATE INDEX "purchases_storeId_deliveredAt_idx" ON "purchases"("storeId", "deliveredAt");
CREATE INDEX "purchases_storeId_driverId_idx" ON "purchases"("storeId", "driverId");

ALTER TABLE "purchases" ADD CONSTRAINT "purchases_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
