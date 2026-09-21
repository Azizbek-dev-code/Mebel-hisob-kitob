/**
 * Self-service account deletion contract.
 *
 * The confirmation phrase is English on purpose: it is a safety gate, not UI copy.
 * Reason codes are stored in Postgres so platform admins can review why accounts left.
 */

export const ACCOUNT_DELETE_CONFIRMATION = 'DELETE MY ACCOUNT';

/** Owner confirmation to close the current Business workspace + store (Identity / Personal stay). */
export const BUSINESS_DELETE_CONFIRMATION = 'DELETE MY BUSINESS';

export const AccountDeletionReasonCode = {
  NOT_NEEDED: 'NOT_NEEDED',
  TOO_HARD: 'TOO_HARD',
  MISSING_FEATURES: 'MISSING_FEATURES',
  SWITCHED_APP: 'SWITCHED_APP',
  TOO_EXPENSIVE: 'TOO_EXPENSIVE',
  OTHER: 'OTHER',
} as const;

export type AccountDeletionReasonCode =
  (typeof AccountDeletionReasonCode)[keyof typeof AccountDeletionReasonCode];

export const ACCOUNT_DELETION_REASON_CODES = Object.values(AccountDeletionReasonCode);

export const ACCOUNT_DELETION_REASON_LABELS: Record<AccountDeletionReasonCode, string> = {
  NOT_NEEDED: 'Dastur menga kerak emas',
  TOO_HARD: 'Dasturdan foydalanish qiyin',
  MISSING_FEATURES: 'Kerakli funksiyalar yo‘q',
  SWITCHED_APP: 'Boshqa dasturga o‘tdim',
  TOO_EXPENSIVE: 'Juda qimmat',
  OTHER: 'Boshqa sabab',
};
