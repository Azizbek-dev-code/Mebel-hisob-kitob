-- Extra personal wallet kinds. No storeId. Existing CASH/CARD/BANK/OTHER stay.

ALTER TYPE "PersonalWalletKind" ADD VALUE IF NOT EXISTS 'UZCARD';
ALTER TYPE "PersonalWalletKind" ADD VALUE IF NOT EXISTS 'HUMO';
ALTER TYPE "PersonalWalletKind" ADD VALUE IF NOT EXISTS 'PAYME';
ALTER TYPE "PersonalWalletKind" ADD VALUE IF NOT EXISTS 'CLICK';
ALTER TYPE "PersonalWalletKind" ADD VALUE IF NOT EXISTS 'SAVINGS';
