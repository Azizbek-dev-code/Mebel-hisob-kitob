import {
  WorkerFinancialTransactionType,
  type WorkerFinancialCreatableType,
  type WorkerFinancialTransactionType as WorkerFinancialTransactionTypeValue,
} from '../constants/enums.js';
import type { Money } from '../types/api.js';
import { toMoney } from '../utils/money.js';

/**
 * Classification / sign semantics for worker financial transactions.
 *
 * Pure helpers only — no payroll, salary, or commission-from-sales logic.
 * Amounts on ledger rows are always positive; these functions decide how a
 * `type` affects the worker's position relative to the store.
 *
 * REVERSAL rows keep a positive amount and store `reversesType` (the original
 * type). Their net contribution is the opposite of that original type's effect.
 */

export type WorkerFinancialEffectKind =
  | 'earning'
  | 'payment'
  | 'advance'
  | 'debt'
  | 'adjustment'
  | 'reversal';

/**
 * How a transaction type contributes to `netFinancialPosition`:
 * - `+1` credits the worker (increases amount still associated with them)
 * - `-1` debits the worker (advance, debt, or money already paid)
 */
export type WorkerFinancialNetSign = 1 | -1;

export type ReversibleWorkerFinancialTransactionType = WorkerFinancialCreatableType;

export interface WorkerFinancialTransactionEffect {
  type: WorkerFinancialTransactionTypeValue;
  kind: WorkerFinancialEffectKind;
  /**
   * Contribution multiplier for netFinancialPosition.
   * For REVERSAL this is the opposite of `reversesType`'s netSign.
   */
  netSign: WorkerFinancialNetSign;
  /** True when the type increases worker earnings (bonus / commission). */
  increasesEarnings: boolean;
  /** True when the type records money already paid to the worker. */
  isAlreadyPaid: boolean;
  /** True when the type increases what the worker owes the store. */
  increasesDebt: boolean;
  /** Original type being offset when `type` is REVERSAL. */
  reversesType?: ReversibleWorkerFinancialTransactionType;
}

const BASE_EFFECTS: Record<
  ReversibleWorkerFinancialTransactionType,
  Omit<WorkerFinancialTransactionEffect, 'type' | 'reversesType'>
> = {
  [WorkerFinancialTransactionType.BONUS]: {
    kind: 'earning',
    netSign: 1,
    increasesEarnings: true,
    isAlreadyPaid: false,
    increasesDebt: false,
  },
  [WorkerFinancialTransactionType.COMMISSION]: {
    kind: 'earning',
    netSign: 1,
    increasesEarnings: true,
    isAlreadyPaid: false,
    increasesDebt: false,
  },
  [WorkerFinancialTransactionType.ADVANCE]: {
    kind: 'advance',
    netSign: -1,
    increasesEarnings: false,
    isAlreadyPaid: false,
    increasesDebt: false,
  },
  [WorkerFinancialTransactionType.DEBT]: {
    kind: 'debt',
    netSign: -1,
    increasesEarnings: false,
    isAlreadyPaid: false,
    increasesDebt: true,
  },
  [WorkerFinancialTransactionType.PAYMENT]: {
    kind: 'payment',
    netSign: -1,
    increasesEarnings: false,
    isAlreadyPaid: true,
    increasesDebt: false,
  },
  [WorkerFinancialTransactionType.ADJUSTMENT]: {
    // Positive manual correction favoring the worker. Debit adjustments are
    // recorded with DEBT / ADVANCE / PAYMENT types, not a negative amount.
    kind: 'adjustment',
    netSign: 1,
    increasesEarnings: false,
    isAlreadyPaid: false,
    increasesDebt: false,
  },
};

export function isReversibleWorkerFinancialType(
  type: WorkerFinancialTransactionTypeValue,
): type is ReversibleWorkerFinancialTransactionType {
  return type !== WorkerFinancialTransactionType.REVERSAL;
}

export function isWorkerReversal(type: WorkerFinancialTransactionTypeValue): boolean {
  return type === WorkerFinancialTransactionType.REVERSAL;
}

/**
 * Effect for a ledger row.
 *
 * For REVERSAL, pass `reversesType` (the original transaction's type). Without
 * it, REVERSAL cannot be classified — callers must supply the original type.
 */
export function getWorkerTransactionEffect(
  type: WorkerFinancialTransactionTypeValue,
  reversesType?: WorkerFinancialTransactionTypeValue,
): WorkerFinancialTransactionEffect {
  if (type === WorkerFinancialTransactionType.REVERSAL) {
    if (!reversesType || !isReversibleWorkerFinancialType(reversesType)) {
      throw new Error('REVERSAL requires a reversible reversesType');
    }
    const original = BASE_EFFECTS[reversesType];
    return {
      type,
      kind: 'reversal',
      netSign: original.netSign === 1 ? -1 : 1,
      increasesEarnings: false,
      isAlreadyPaid: false,
      increasesDebt: false,
      reversesType,
    };
  }

  return { type, ...BASE_EFFECTS[type] };
}

export function isWorkerEarning(type: WorkerFinancialTransactionTypeValue): boolean {
  if (type === WorkerFinancialTransactionType.REVERSAL) return false;
  return getWorkerTransactionEffect(type).increasesEarnings;
}

export function isWorkerPayment(type: WorkerFinancialTransactionTypeValue): boolean {
  if (type === WorkerFinancialTransactionType.REVERSAL) return false;
  return getWorkerTransactionEffect(type).isAlreadyPaid;
}

export function isWorkerDebt(type: WorkerFinancialTransactionTypeValue): boolean {
  if (type === WorkerFinancialTransactionType.REVERSAL) return false;
  return getWorkerTransactionEffect(type).increasesDebt;
}

export function isWorkerAdvance(type: WorkerFinancialTransactionTypeValue): boolean {
  if (type === WorkerFinancialTransactionType.REVERSAL) return false;
  return getWorkerTransactionEffect(type).kind === 'advance';
}

export function isWorkerAdjustment(type: WorkerFinancialTransactionTypeValue): boolean {
  if (type === WorkerFinancialTransactionType.REVERSAL) return false;
  return getWorkerTransactionEffect(type).kind === 'adjustment';
}

/** Signed so'm contribution of one row toward netFinancialPosition. */
export function signedWorkerTransactionAmount(
  type: WorkerFinancialTransactionTypeValue,
  amount: Money,
  reversesType?: WorkerFinancialTransactionTypeValue,
): Money {
  return toMoney(getWorkerTransactionEffect(type, reversesType).netSign * amount);
}

export interface WorkerFinancialTotalsInput {
  totalBonuses: Money;
  totalCommissions: Money;
  totalAdvances: Money;
  totalDebt: Money;
  totalPayments: Money;
  totalAdjustments: Money;
  /**
   * Positive REVERSAL amounts keyed by the original type they offset.
   * Example: reversing a 500_000 BONUS → `{ BONUS: 500_000 }`.
   */
  reversalsByOriginalType?: Partial<
    Record<ReversibleWorkerFinancialTransactionType, Money>
  >;
}

/**
 * Net ledger position from classified totals — NOT salary and NOT final payroll.
 *
 * Base formula:
 *   bonuses + commissions + adjustments − advances − debt − payments
 *
 * Each REVERSAL then adds the opposite signed contribution of its original type,
 * so (BONUS 500k + REVERSAL of that BONUS 500k) nets to 0.
 */
export function computeWorkerNetFinancialPosition(
  totals: WorkerFinancialTotalsInput,
): Money {
  let net =
    totals.totalBonuses +
    totals.totalCommissions +
    totals.totalAdjustments -
    totals.totalAdvances -
    totals.totalDebt -
    totals.totalPayments;

  const reversals = totals.reversalsByOriginalType ?? {};
  for (const [originalType, amount] of Object.entries(reversals) as Array<
    [ReversibleWorkerFinancialTransactionType, Money]
  >) {
    if (amount === undefined) continue;
    net += signedWorkerTransactionAmount(
      WorkerFinancialTransactionType.REVERSAL,
      amount,
      originalType,
    );
  }

  return toMoney(net);
}
