import { SaleStatus } from '../constants/enums.js';

/**
 * The sale statuses whose money is real.
 *
 * A draft has not been agreed with the customer and a cancelled sale never
 * happened, so counting either would overstate revenue, profit and debt. Every
 * report scopes on this list rather than restating the rule, so a status added
 * later is decided in one place.
 */
export const REVENUE_SALE_STATUSES = [SaleStatus.ACTIVE, SaleStatus.COMPLETED] as const;

export function countsTowardsRevenue(status: SaleStatus): boolean {
  return (REVENUE_SALE_STATUSES as readonly SaleStatus[]).includes(status);
}
