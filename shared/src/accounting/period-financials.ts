import type { Money } from '../types/api.js';
import { toMoney } from '../utils/money.js';

/**
 * Period-level financial helpers shared by dashboard and analytics.
 *
 * Sale-level revenue / COGS / gross / net stay in `sale-totals.ts`. This module
 * only combines already-stored period aggregates with operating expenses.
 */

export interface PeriodSalesTotals {
  revenue: Money;
  costOfGoods: Money;
  grossProfit: Money;
  netProfit: Money;
}

/**
 * Percentage change between two money totals.
 * Returns `null` when the previous total is zero (undefined growth).
 */
export function moneyChangePercent(current: Money, previous: Money): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

/**
 * Category / share percentage from integer so'm totals.
 * Rounded to one decimal place without floating the money itself.
 */
export function moneySharePercent(part: Money, whole: Money): number | null {
  if (whole === 0) return null;
  return Math.round((part * 1000) / whole) / 10;
}

/**
 * Bottom-line operating result for the analytics API:
 * gross profit less period business expenses.
 */
export function periodNetProfit(grossProfit: Money, operatingExpenses: Money): Money {
  return toMoney(grossProfit - operatingExpenses);
}

/**
 * Dashboard-compatible result: sale net profit (after per-sale add-ons) less
 * period business expenses.
 */
export function periodNetResult(saleNetProfit: Money, operatingExpenses: Money): Money {
  return toMoney(saleNetProfit - operatingExpenses);
}

export function periodAdditionalCosts(grossProfit: Money, saleNetProfit: Money): Money {
  return toMoney(grossProfit - saleNetProfit);
}
