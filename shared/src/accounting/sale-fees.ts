import {
  WorkerCompensationType,
  type WorkerCompensationType as WorkerCompensationTypeValue,
} from '../constants/enums.js';
import type { Money } from '../types/api.js';
import {
  calculateWorkerCompensation,
  findSellerCompensationRuleForSaleDate,
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
  installerFee?: Money;
  driverFee?: Money;
  installationCost?: Money;
  deliveryCost?: Money;
}

export interface ResolvedSaleFeeCosts {
  installationCost?: Money;
  installerFee?: Money;
  deliveryCost?: Money;
}

/** Prefer assemblerFee/driverFee when provided; fall back to legacy field names. */
export function resolveSaleFeeAliases(input: SaleFeeAliasInput): ResolvedSaleFeeCosts {
  return {
    installationCost:
      input.assemblerFee !== undefined ? input.assemblerFee : input.installationCost,
    installerFee: input.installerFee,
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

export interface SellerCommissionLine {
  ruleType: WorkerCompensationTypeValue | 'MANUAL_SELLER';
  /** Stable COMPENSATION reference suffix after `${saleId}:`. */
  referenceSuffix: string;
  amount: Money;
  rateLabel: string | null;
  baseLabel: string;
  baseAmount: Money;
  ruleValue: number;
}

const SELLER_TYPE_LABELS: Record<(typeof SELLER_SALE_COMPENSATION_TYPES)[number], string> = {
  [WorkerCompensationType.PERCENT_OF_SALE]: 'Sotuv summasidan foiz',
  [WorkerCompensationType.PERCENT_OF_GROSS_PROFIT]: 'Yalpi foydadan foiz',
  [WorkerCompensationType.FIXED_PER_SALE]: 'Har bir sotuv uchun summa',
};

export function sellerCompensationTypeLabel(
  type: WorkerCompensationTypeValue | 'MANUAL_SELLER' | string | null,
): string {
  if (type === 'MANUAL_SELLER') return "Qo'lda belgilangan";
  if (type === WorkerCompensationType.PERCENT_OF_SALE) return SELLER_TYPE_LABELS.PERCENT_OF_SALE;
  if (type === WorkerCompensationType.PERCENT_OF_GROSS_PROFIT) {
    return SELLER_TYPE_LABELS.PERCENT_OF_GROSS_PROFIT;
  }
  if (type === WorkerCompensationType.FIXED_PER_SALE) return SELLER_TYPE_LABELS.FIXED_PER_SALE;
  return type ?? '—';
}

/**
 * Per-rule seller commission lines for one sale.
 *
 * PERCENT_OF_GROSS_PROFIT = max(0, grossProfit) × rate.
 * grossProfit = sale revenue − cost price.
 * Usta / shopir / installer fees and stored netProfit MUST NOT reduce the base.
 * Negative / zero gross profit → 0 (never a negative commission).
 * Manual Ish haqlari (SELLER) override rule lines when `manualAmount` > 0.
 */
export function computeSellerCommissionLines(input: {
  rules: readonly SellerCommissionRuleInput[];
  saleDate: Date;
  totalSalePrice: Money;
  grossProfit: Money;
  /** SaleWorkerCompensation SELLER override; skips rule engine when > 0. */
  manualAmount?: Money | null;
}): SellerCommissionLine[] {
  if (input.manualAmount != null && input.manualAmount > 0) {
    return [
      {
        ruleType: 'MANUAL_SELLER',
        referenceSuffix: 'MANUAL:SELLER',
        amount: input.manualAmount,
        rateLabel: "qo'lda",
        baseLabel: "Qo'lda belgilangan",
        baseAmount: input.manualAmount,
        ruleValue: input.manualAmount,
      },
    ];
  }

  const active = input.rules;
  const commissionBase = Math.max(0, input.grossProfit);
  const lines: SellerCommissionLine[] = [];

  for (const type of SELLER_SALE_COMPENSATION_TYPES) {
    // Match on saleDate (business date), not createdAt / today. Backdated sales
    // still receive the current open-ended rate when no earlier window exists.
    const rule = findSellerCompensationRuleForSaleDate(active, type, input.saleDate);
    if (!rule) continue;

    const baseAmount =
      type === WorkerCompensationType.PERCENT_OF_SALE
        ? input.totalSalePrice
        : type === WorkerCompensationType.PERCENT_OF_GROSS_PROFIT
          ? commissionBase
          : undefined;

    const amount = calculateWorkerCompensation({
      type,
      value: rule.value,
      baseAmount,
    });
    if (amount <= 0) continue;

    const rateLabel = isPercentCompensationType(type)
      ? formatBasisPointsAsPercentLabel(rule.value)
      : "qat'iy";
    const baseLabel =
      type === WorkerCompensationType.PERCENT_OF_GROSS_PROFIT
        ? 'Yalpi foyda'
        : type === WorkerCompensationType.PERCENT_OF_SALE
          ? 'Sotuv summasi'
          : "Qat'iy summa";
    const resolvedBase =
      type === WorkerCompensationType.FIXED_PER_SALE ? amount : (baseAmount ?? 0);

    lines.push({
      ruleType: type,
      referenceSuffix: type,
      amount,
      rateLabel,
      baseLabel,
      baseAmount: resolvedBase,
      ruleValue: rule.value,
    });
  }

  return lines;
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
  manualAmount?: Money | null;
}): SellerCommissionEstimate {
  const lines = computeSellerCommissionLines(input);
  const first = lines[0];
  return {
    amount: lines.reduce((sum, line) => sum + line.amount, 0),
    rateLabel: first?.rateLabel ?? null,
    ruleType:
      first && first.ruleType !== 'MANUAL_SELLER'
        ? first.ruleType
        : first
          ? WorkerCompensationType.FIXED_PER_SALE
          : null,
  };
}

export function sellerCompensationRef(saleId: string, suffix: string): string {
  return `${saleId}:${suffix}`;
}

const SELLER_COMPENSATION_REF_SUFFIX =
  /:(PERCENT_OF_SALE|PERCENT_OF_GROSS_PROFIT|FIXED_PER_SALE|MANUAL:SELLER)$/;

export function isSellerCompensationRef(
  saleId: string,
  referenceId: string | null | undefined,
): boolean {
  if (!referenceId || !referenceId.startsWith(`${saleId}:`)) return false;
  return SELLER_COMPENSATION_REF_SUFFIX.test(referenceId);
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
  installerFee?: Money;
  driverFee: Money;
}): Money {
  return (
    input.grossProfit -
    input.sellerCommissionEstimate -
    input.assemblerFee -
    (input.installerFee ?? 0) -
    input.driverFee
  );
}
