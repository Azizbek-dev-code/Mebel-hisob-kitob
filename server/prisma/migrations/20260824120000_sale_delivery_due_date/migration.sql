-- AlterTable
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "deliveryDueDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_storeId_deliveryDueDate_idx" ON "sales"("storeId", "deliveryDueDate");
