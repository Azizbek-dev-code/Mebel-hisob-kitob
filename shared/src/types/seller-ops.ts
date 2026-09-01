import type {
  DateRangePreset,
  SalePaymentStatus,
  SaleStatus,
  WorkerCompensationType,
} from '../constants/enums.js';
import type { IsoDateString, Money } from './api.js';

/**
 * Seller (Sotuvchilik) operations — commission lifecycle for a sale.
 *
 * ESTIMATE is read-only preview. EARNED is a posted COMMISSION ledger row.
 * PAID / PARTIALLY_PAID are derived from worker-level payments vs earned.
 */

export const SellerCommissionStatus = {
  NONE: 'NONE',
  ESTIMATED: 'ESTIMATED',
  EARNED: 'EARNED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  REVERSED: 'REVERSED',
  CANCELLED: 'CANCELLED',
} as const;
export type SellerCommissionStatus =
  (typeof SellerCommissionStatus)[keyof typeof SellerCommissionStatus];

export const SELLER_COMMISSION_STATUS_LABELS: Record<SellerCommissionStatus, string> = {
  NONE: 'Qoida yo‘q',
  ESTIMATED: 'Taxminiy',
  EARNED: 'Hisoblangan',
  PARTIALLY_PAID: 'Qisman to‘langan',
  PAID: 'To‘langan',
  REVERSED: 'Qaytarilgan',
  CANCELLED: 'Bekor qilingan',
};

export interface SellerActiveRule {
  id: string;
  type: WorkerCompensationType;
  value: number;
  rateLabel: string;
  typeLabel: string;
  effectiveFrom: IsoDateString;
  effectiveTo: IsoDateString | null;
}

export interface SellerSaleOpsItem {
  id: string;
  saleNumber: number;
  saleDate: IsoDateString;
  customerName: string;
  productSummary: string;
  totalSalePrice: Money;
  totalCostPrice: Money;
  grossProfit: Money;
  netProfit: Money;
  paidAmount: Money;
  remainingAmount: Money;
  paymentStatus: SalePaymentStatus;
  status: SaleStatus;
  ruleType: string | null;
  rateLabel: string | null;
  estimatedCommission: Money;
  earnedCommission: Money;
  commissionStatus: SellerCommissionStatus;
}

export interface SellerReportPaymentItem {
  id: string;
  amount: Money;
  transactionDate: IsoDateString;
  description: string | null;
  type: 'PAYMENT' | 'REVERSAL';
}

export interface SellerReportSummary {
  salesCount: number;
  salesAmount: Money;
  grossProfit: Money;
  netProfit: Money;
  estimatedCommission: Money;
  earned: Money;
  bonus: Money;
  paid: Money;
  outstanding: Money;
}

export interface SellerReport {
  worker: { id: string; fullName: string };
  period: { from: string; to: string; preset: DateRangePreset };
  summary: SellerReportSummary;
  sales: SellerSaleOpsItem[];
  payments: SellerReportPaymentItem[];
}

export interface SellerReportResponse {
  report: SellerReport;
}
