import {
  WorkerCompensationType,
  type WorkerCompensationType as WorkerCompensationTypeValue,
} from '../constants/enums.js';
import type { Money } from '../types/api.js';
import {
  calculateWorkerCompensation,
  findCompensationRuleForTypeOnDate,
  isPercentCompensationType,
} from './worker-compensation.js';

/**
 * Sale-level master/driver fees.
 *
 * API aliases (prefer in new UI):
 * - `assemblerFee` → persists as `Sale.installationCost` (Usta haqqi)
 * - `driverFee` → persists as `Sale.deliveryCost` (Shopir haqqi)
 *
 * Both alias and legacy names are accepted; when both are present, the alias wins.
 * These feed `calculateSaleTotals` → `netProfit`. Seller % commission stays on
 * WorkerCompensationRule and must not be written into `sellerBonus`.
 */

export interface SaleFeeAliasInput {
  assemblerFee?: Money;
  driverFee?: Money;
  installationCost?: Money;
  deliveryCost?: Money;
}

export interface ResolvedSaleFeeCosts {
  installationCost?: Money;
  deliveryCost?: Money;
}

/** Prefer assemblerFee/driverFee when provided; fall back to legacy field names. */
export function resolveSaleFeeAliases(input: SaleFeeAliasInput): ResolvedSaleFeeCosts {
  return {
    installationCost:
      input.assemblerFee !== undefined ? input.assemblerFee : input.installationCost,
    deliveryCost: input.driverFee !== undefined ? input.driverFee : input.deliveryCost,
  };
}

const SELLER_SALE_COMPENSATION_TYPES = [
  WorkerCompensationType.PERCENT_OF_SALE,
  WorkerCompensationType.PERCENT_OF_GROSS_PROFIT,
  WorkerCompensationType.FIXED_PER_SALE,
] as const;

export interface SellerCommissionRuleInput {
  id: string;
  type: WorkerCompensationTypeValue;
  value: number;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export interface SellerCommissionEstimate {
  /** Sum of matching seller sale-rule amounts for this sale (read-only preview). */
  amount: Money;
  /**
   * Human rate label for the primary matching rule, e.g. "10%".
   * `null` when no active rule covers the sale date ("qoida yo'q").
   */
  rateLabel: string | null;
  ruleType: WorkerCompensationTypeValue | null;
}

/**
 * Read-only estimate of seller % / fixed-per-sale commission for a sale detail.
 * Does not write sellerBonus or ledger rows. Inactive rules are ignored.
 */
export function estimateSellerCommission(input: {
  rules: readonly SellerCommissionRuleInput[];
  saleDate: Date;
  totalSalePrice: Money;
  grossProfit: Money;
}): SellerCommissionEstimate {
  const active = input.rules.filter((rule) => rule.isActive);
  let amount = 0;
  let rateLabel: string | null = null;
  let ruleType: WorkerCompensationTypeValue | null = null;

  for (const type of SELLER_SALE_COMPENSATION_TYPES) {
    const rule = findCompensationRuleForTypeOnDate(active, type, input.saleDate);
    if (!rule) continue;

    const baseAmount =
      type === WorkerCompensationType.PERCENT_OF_SALE
        ? input.totalSalePrice
        : type === WorkerCompensationType.PERCENT_OF_GROSS_PROFIT
          ? input.grossProfit
          : undefined;

    const line = calculateWorkerCompensation({
      type,
      value: rule.value,
      baseAmount,
    });
    amount += line;

    if (ruleType === null) {
      ruleType = type;
      rateLabel = isPercentCompensationType(type)
        ? formatBasisPointsAsPercentLabel(rule.value)
        : 'qat\'iy';
    }
  }

  return { amount, rateLabel, ruleType };
}

/** Display form: 1000 → "10%", 250 → "2.5%". */
export function formatBasisPointsAsPercentLabel(basisPoints: number): string {
  if (!Number.isInteger(basisPoints) || basisPoints < 0) return '—';
  const whole = Math.trunc(basisPoints / 100);
  const frac = basisPoints % 100;
  if (frac === 0) return `${whole}%`;
  if (frac % 10 === 0) return `${whole}.${frac / 10}%`;
  return `${whole}.${String(frac).padStart(2, '0')}%`;
}

/**
 * Display-only remaining profit after seller estimate + usta/shopir fees.
 * Stored `netProfit` still uses sellerBonus + installationCost + deliveryCost + otherCosts.
 */
export function estimateRemainingSaleProfit(input: {
  grossProfit: Money;
  sellerCommissionEstimate: Money;
  assemblerFee: Money;
  driverFee: Money;
}): Money {
  return (
    input.grossProfit -
    input.sellerCommissionEstimate -
    input.assemblerFee -
    input.driverFee
  );
}
