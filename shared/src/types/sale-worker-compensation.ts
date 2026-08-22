import type {
  SaleWorkerPayRole,
  SaleWorkerPaySource,
  WorkerResponsibility,
} from '../constants/enums.js';
import { WorkerResponsibility as WorkerResponsibilityEnum } from '../constants/enums.js';
import type { Money } from './api.js';

/**
 * Sale-specific manual worker pay (Ish haqlari) — optional advanced path.
 *
 * Preferred simple sale fees (create/detail UI):
 * - Usta haqqi = `assemblerFee` → `installationCost`
 * - Shopir haqqi = `driverFee` → `deliveryCost`
 * Those feed `netProfit` via `calculateSaleTotals`. Do not also send MANUAL
 * ASSEMBLER/SHOPIR rows for the same amounts (avoid double-count with settle).
 *
 * - `sellerBonus` / `deliveryCost` / `installationCost` remain sale cost fields
 *   used by `netProfit` (grossProfit − those costs).
 * - Manual `SaleWorkerCompensation` feeds compensation preview/settle only and
 *   does **not** change the sale `netProfit` formula.
 * - Seller % commission stays on WorkerCompensationRule — not sellerBonus.
 * - Period P&L uses settled COMMISSION; do not double-subtract manuals.
 * - MANUAL overrides RULE for the same sale event bucket
 *   (SELLER→SALE, ASSEMBLER→ASSEMBLY, DASTAFCHI/SHOPIR→DELIVERY).
 */

export type { SaleWorkerPayRole, SaleWorkerPaySource };

export interface SaleWorkerCompensationInput {
  role: SaleWorkerPayRole;
  workerId: string;
  /** Whole so'm; integer ≥ 0. */
  amount: Money;
}

export interface SaleWorkerCompensationDto {
  id: string;
  role: SaleWorkerPayRole;
  workerId: string;
  worker: { id: string; fullName: string };
  amount: Money;
  source: SaleWorkerPaySource;
  /** Responsibility required / implied by the role. */
  responsibility: WorkerResponsibility;
}

export const SALE_WORKER_PAY_ROLE_LABELS: Record<SaleWorkerPayRole, string> = {
  SELLER: 'Sotuvchi',
  ASSEMBLER: 'Usta',
  DASTAFCHI: 'Dastafchi',
  SHOPIR: 'Shopir',
};

export const SALE_WORKER_PAY_SOURCE_LABELS: Record<SaleWorkerPaySource, string> = {
  MANUAL: "Qo'lda",
  RULE: 'Qoidaga asosan',
};

/** Responsibility a worker must hold for each pay role. */
export const SALE_WORKER_PAY_ROLE_RESPONSIBILITY: Record<
  SaleWorkerPayRole,
  WorkerResponsibility
> = {
  SELLER: WorkerResponsibilityEnum.SELLER,
  ASSEMBLER: WorkerResponsibilityEnum.ASSEMBLER,
  DASTAFCHI: WorkerResponsibilityEnum.DELIVERY,
  SHOPIR: WorkerResponsibilityEnum.DELIVERY,
};
