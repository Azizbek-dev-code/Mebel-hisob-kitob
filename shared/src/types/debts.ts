import type {
  PaymentMethod,
  PaymentType,
  SalePaymentStatus,
} from '../constants/enums.js';
import type { IsoDateString, Money, PaginatedResult, PaginationQuery } from './api.js';

export type DebtListFilter = 'ALL' | 'OVERDUE' | 'UNPAID' | 'PARTIALLY_PAID';

export interface DebtListQuery extends PaginationQuery {
  search?: string;
  filter?: DebtListFilter;
}

export interface DebtSummary {
  totalOutstanding: Money;
  customersInDebt: number;
  openSaleCount: number;
  overdueInstallmentCount: number;
  overdueAmount: Money;
}

export interface DebtListItem {
  saleId: string;
  saleNumber: number;
  saleDate: IsoDateString;
  customerId: string;
  customerName: string;
  customerPhone: string;
  paymentType: PaymentType;
  paymentStatus: SalePaymentStatus;
  totalSalePrice: Money;
  paidAmount: Money;
  remainingAmount: Money;
  sellerName: string | null;
  hasOverdueInstallment: boolean;
  overdueAmount: Money;
  nextDueDate: IsoDateString | null;
}

export interface DebtListResponse {
  summary: DebtSummary;
  items: DebtListItem[];
  meta: PaginatedResult<DebtListItem>['meta'];
}

/** Reuses sale payment endpoint semantics. */
export interface RecordDebtPaymentRequest {
  amount: Money;
  method: PaymentMethod;
  paidAt?: IsoDateString;
  note?: string;
  installmentPaymentId?: string;
}
