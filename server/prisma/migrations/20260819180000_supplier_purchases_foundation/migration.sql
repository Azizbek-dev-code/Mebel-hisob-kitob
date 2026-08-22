-- Supplier purchases foundation: suppliers, purchase invoices, items, payments.
-- Stock movements already have PURCHASE referenceType; purchaseId will be used as referenceId.

CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "PurchaseStatus" AS ENUM ('ACTIVE', 'CANCELLED');
CREATE TYPE "PurchasePaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "purchaseNumber" INTEGER NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCost" BIGINT NOT NULL,
    "paidAmount" BIGINT NOT NULL DEFAULT 0,
    "remainingAmount" BIGINT NOT NULL DEFAULT 0,
    "paymentStatus" "PurchasePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "status" "PurchaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" BIGINT NOT NULL,
    "lineTotal" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_payments" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "suppliers_storeId_status_idx" ON "suppliers"("storeId", "status");
CREATE INDEX "suppliers_storeId_name_idx" ON "suppliers"("storeId", "name");

CREATE UNIQUE INDEX "purchases_storeId_purchaseNumber_key" ON "purchases"("storeId", "purchaseNumber");
CREATE INDEX "purchases_storeId_purchaseDate_idx" ON "purchases"("storeId", "purchaseDate");
CREATE INDEX "purchases_storeId_status_idx" ON "purchases"("storeId", "status");
CREATE INDEX "purchases_storeId_paymentStatus_idx" ON "purchases"("storeId", "paymentStatus");
CREATE INDEX "purchases_storeId_supplierId_idx" ON "purchases"("storeId", "supplierId");
CREATE INDEX "purchases_storeId_remainingAmount_idx" ON "purchases"("storeId", "remainingAmount");

CREATE INDEX "purchase_items_storeId_purchaseId_idx" ON "purchase_items"("storeId", "purchaseId");
CREATE INDEX "purchase_items_storeId_productId_idx" ON "purchase_items"("storeId", "productId");

CREATE INDEX "supplier_payments_storeId_paidAt_idx" ON "supplier_payments"("storeId", "paidAt");
CREATE INDEX "supplier_payments_storeId_purchaseId_idx" ON "supplier_payments"("storeId", "purchaseId");
CREATE INDEX "supplier_payments_storeId_supplierId_idx" ON "supplier_payments"("storeId", "supplierId");

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchases" ADD CONSTRAINT "purchases_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
