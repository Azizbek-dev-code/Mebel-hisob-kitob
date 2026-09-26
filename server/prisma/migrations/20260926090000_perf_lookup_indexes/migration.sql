-- Performance indexes from production audit (additive only).

CREATE INDEX IF NOT EXISTS "sales_storeId_installerId_idx" ON "sales"("storeId", "installerId");
CREATE INDEX IF NOT EXISTS "sales_storeId_deliveryPersonId_idx" ON "sales"("storeId", "deliveryPersonId");
CREATE INDEX IF NOT EXISTS "worker_activities_storeId_relatedSaleId_idx" ON "worker_activities"("storeId", "relatedSaleId");
CREATE INDEX IF NOT EXISTS "telegram_pending_links_identityId_idx" ON "telegram_pending_links"("identityId");
CREATE INDEX IF NOT EXISTS "referral_commissions_withdrawalId_status_idx" ON "referral_commissions"("withdrawalId", "status");
