-- Platform expense salaries + indexed platform finance / account-growth queries.
-- Does not rewrite old migrations. Does not touch ERP Sale/Expense or PersonalEntry.

ALTER TYPE "PlatformExpenseCategory" ADD VALUE IF NOT EXISTS 'SALARY';

CREATE INDEX IF NOT EXISTS "platform_invoices_status_paidAt_idx"
  ON "platform_invoices"("status", "paidAt");

CREATE INDEX IF NOT EXISTS "workspaces_type_createdAt_idx"
  ON "workspaces"("type", "createdAt");
