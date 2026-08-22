import type { WorkerCompensationType, WorkerResponsibility } from '../constants/enums.js';
import type { IsoDateString, Money } from './api.js';

/**
 * Worker compensation rule — configuration only.
 *
 * `value` meaning by type:
 * - PERCENT_OF_SALE / PERCENT_OF_GROSS_PROFIT → basis points (10% = 1000)
 * - FIXED_* → whole so'm amount
 *
 * Creating/updating a rule MUST NOT create WorkerFinancialTransaction rows.
 */

export interface WorkerCompensationRuleWorkerSummary {
  id: string;
  fullName: string;
  isActive: boolean;
}

export interface WorkerCompensationRule {
  id: string;
  workerId: string;
  responsibility: WorkerResponsibility;
  type: WorkerCompensationType;
  /**
   * Percent types: integer basis points (1% = 100, 100% = 10_000).
   * Fixed types: positive whole so'm.
   */
  value: number;
  isActive: boolean;
  effectiveFrom: IsoDateString;
  effectiveTo: IsoDateString | null;
  notes: string | null;
  worker: WorkerCompensationRuleWorkerSummary;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CreateWorkerCompensationRuleRequest {
  responsibility: WorkerResponsibility;
  type: WorkerCompensationType;
  value: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateWorkerCompensationRuleRequest {
  value?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export type WorkerCompensationRuleListResponse = {
  items: WorkerCompensationRule[];
};
export type WorkerCompensationRuleDetailResponse = {
  rule: WorkerCompensationRule;
};
export type CreateWorkerCompensationRuleResponse = {
  rule: WorkerCompensationRule;
};
export type UpdateWorkerCompensationRuleResponse = {
  rule: WorkerCompensationRule;
};

/** Re-export Money for helpers that compute compensation amounts. */
export type WorkerCompensationMoney = Money;

/** Shown on every compensation preview response and UI. */
export const WORKER_COMPENSATION_PREVIEW_DISCLAIMER =
  "Bu faqat hisob-kitob ko'rinishi. Hech qanday moliyaviy tranzaksiya yaratilmaydi.";

/** Business event kinds included in a read-only compensation preview. */
export const WorkerCompensationPreviewEventKind = {
  SALE: 'SALE',
  ASSEMBLY: 'ASSEMBLY',
  DELIVERY: 'DELIVERY',
  INSTALLATION: 'INSTALLATION',
} as const;
export type WorkerCompensationPreviewEventKind =
  (typeof WorkerCompensationPreviewEventKind)[keyof typeof WorkerCompensationPreviewEventKind];

export interface WorkerCompensationPreviewBreakdownItem {
  id: string;
  eventDate: IsoDateString;
  eventKind: WorkerCompensationPreviewEventKind;
  /** Human-readable event label (e.g. sale number / product). */
  description: string;
  /** Base amount used for percent rules; fixed events may repeat the fee or sale total. */
  eventAmount: Money;
  ruleId: string;
  ruleType: WorkerCompensationType;
  responsibility: WorkerResponsibility;
  /** Basis points or fixed so'm — same semantics as WorkerCompensationRule.value. */
  ruleValue: number;
  compensationAmount: Money;
  referenceType: 'SALE' | 'ASSEMBLY_TASK';
  referenceId: string;
  /**
   * MANUAL = sale-form Ish haqlari override; RULE (default) = compensation rule engine.
   * Settle uses `id` as COMPENSATION referenceId for both.
   */
  source?: 'MANUAL' | 'RULE';
}

export interface WorkerCompensationPreviewSummary {
  saleEventCount: number;
  assemblyEventCount: number;
  deliveryEventCount: number;
  installationEventCount: number;
  applicableRuleCount: number;
  totalCompensation: Money;
  breakdownItemCount: number;
}

export interface WorkerCompensationPreview {
  worker: WorkerCompensationRuleWorkerSummary;
  period: { from: string; to: string };
  summary: WorkerCompensationPreviewSummary;
  breakdown: WorkerCompensationPreviewBreakdownItem[];
  /** Explicit UI/API flag — preview never mutates the ledger. */
  readOnly: true;
  disclaimer: typeof WORKER_COMPENSATION_PREVIEW_DISCLAIMER;
}

export type WorkerCompensationPreviewResponse = {
  preview: WorkerCompensationPreview;
};

/** Settle a preview period into COMMISSION ledger rows (idempotent per breakdown line). */
export interface SettleWorkerCompensationRequest {
  from: string;
  to: string;
}

export interface SettleWorkerCompensationResult {
  worker: WorkerCompensationRuleWorkerSummary;
  period: { from: string; to: string };
  totalCompensation: Money;
  createdCount: number;
  skippedAlreadySettled: number;
  /** Newly created COMMISSION rows (skipped lines are omitted). */
  createdTransactionIds: string[];
}

export type SettleWorkerCompensationResponse = {
  settlement: SettleWorkerCompensationResult;
};
