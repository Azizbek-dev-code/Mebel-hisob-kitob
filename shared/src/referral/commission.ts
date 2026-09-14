/** Integer so'm. Never use a client-supplied commission amount. */
export function computeReferralCommission(sourceAmountSom: number, percent: number): number {
  if (!Number.isInteger(sourceAmountSom) || sourceAmountSom <= 0) return 0;
  if (!Number.isInteger(percent) || percent <= 0) return 0;
  return Math.floor((sourceAmountSom * percent) / 100);
}
