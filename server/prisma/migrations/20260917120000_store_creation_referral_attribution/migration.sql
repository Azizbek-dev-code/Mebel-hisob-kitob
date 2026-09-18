-- Persist referral attribution on guest business store-creation requests so
-- Registration → Approve → Trial → Paid → Commission still finds the original referrer.

ALTER TABLE "store_creation_requests" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "store_creation_requests" ADD COLUMN IF NOT EXISTS "visitorKey" TEXT;
