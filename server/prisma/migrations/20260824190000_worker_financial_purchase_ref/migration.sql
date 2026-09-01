-- Allow purchase-sourced worker fee ledger rows (shopir / freight on kirim).
ALTER TYPE "WorkerFinancialReferenceType" ADD VALUE IF NOT EXISTS 'PURCHASE';
