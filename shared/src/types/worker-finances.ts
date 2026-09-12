import type {
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
  WorkerResponsibility,
} from '../constants/enums.js';
import type { IsoDateString, Money, PaginatedResult, PaginationQuery } from './api.js';

/**
 * Worker financial transactions API contract.
 *
 * Ledger foundation only — not payroll / salary. `storeId` and `createdById`
 * are never accepted from the client; the authenticated session supplies them.
 */

export interface WorkerFinancialCreatedBySummary {
  id: string;
  fullName: string;
}

export interface WorkerFinancialWorkerSummary {
  id: string;
  fullName: string;
  isActive: boolean;
}

export interface WorkerFinancialTransaction {
  id: string;
  workerId: string;
  type: WorkerFinancialTransactionType;
  amount: Money;
  transactionDate: IsoDateString;
  description: string | null;
  referenceType: WorkerFinancialReferenceType | null;
  referenceId: string | null;
  /** Present on REVERSAL rows: the original transaction type being offset. */
  reversesType: WorkerFinancialTransactionType | null;
  /** Responsibility bucket for filters / profile modules. */
  responsibility: WorkerResponsibility | null;
  /**
   * COMMISSION credits that still count toward balance.
   * Closed (`false`) after a REVERSAL so the same business ref may re-post.
   */
  isOpen: boolean;
  worker: WorkerFinancialWorkerSummary;
  createdBy: WorkerFinancialCreatedBySummary | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

/**
 * Classified totals for a worker. Not salary and not final payroll.
 *
 * Classified type totals are gross sums of rows of that type (REVERSAL does not
 * rewrite them). `netFinancialPosition` applies shared sign / reversal semantics.
 */
export interface WorkerFinancialSummary {
  workerId: string;
  worker: WorkerFinancialWorkerSummary;
  totalBonuses: Money;
  totalCommissions: Money;
  totalAdvances: Money;
  totalDebt: Money;
  totalPayments: Money;
  totalAdjustments: Money;
  /** Gross sum of REVERSAL row amounts (always ≥ 0). */
  totalReversals: Money;
  /**
   * Positive REVERSAL amounts keyed by the original type they offset.
   * Used so UI "earned/paid" can net correctly after cancel.
   */
  reversalsByOriginalType?: Partial<
    Record<
      'BONUS' | 'COMMISSION' | 'ADVANCE' | 'DEBT' | 'PAYMENT' | 'ADJUSTMENT',
      Money
    >
  >;
  /**
   * Ledger net including reversal offsets. Positive credits the worker overall;
   * negative means advances/debt/payments exceed earning credits.
   * This is NOT salary and NOT final payroll.
   */
  netFinancialPosition: Money;
  transactionCount: number;
  /** Inclusive calendar bounds used for the summary, when a period was requested. */
  from?: string;
  to?: string;
}

export interface CreateWorkerFinancialTransactionRequest {
  workerId: string;
  type: Exclude<WorkerFinancialTransactionType, 'REVERSAL'>;
  amount: Money;
  transactionDate: string;
  description?: string;
  /** Omit on admin manual rows. Automatic operational / settle posts always send both. */
  referenceType?: Exclude<WorkerFinancialReferenceType, 'REVERSAL'>;
  referenceId?: string;
  responsibility?: WorkerResponsibility;
}

export interface ReverseWorkerFinancialTransactionRequest {
  /** Optional note on the reversal row. */
  description?: string;
  /** When the reversal event happened; defaults to now (store calendar). */
  transactionDate?: string;
}

export interface WorkerFinancialTransactionListQuery extends PaginationQuery {
  type?: WorkerFinancialTransactionType;
  responsibility?: WorkerResponsibility;
  from?: string;
  to?: string;
  search?: string;
}

export interface WorkerFinancialSummaryQuery {
  from?: string;
  to?: string;
}

export type WorkerFinancialTransactionListResponse = PaginatedResult<WorkerFinancialTransaction>;
export type WorkerFinancialTransactionDetailResponse = {
  transaction: WorkerFinancialTransaction;
};
export type CreateWorkerFinancialTransactionResponse = {
  transaction: WorkerFinancialTransaction;
};
export type ReverseWorkerFinancialTransactionResponse = {
  original: WorkerFinancialTransaction;
  reversal: WorkerFinancialTransaction;
};
export type WorkerFinancialSummaryResponse = { summary: WorkerFinancialSummary };
