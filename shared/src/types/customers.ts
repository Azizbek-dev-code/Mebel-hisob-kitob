import type { CustomerStatus, InstallmentStatus, PaymentMethod, SaleStatus } from '../constants/enums.js';
import type { IsoDateString, Money, PaginatedResult, PaginationQuery } from './api.js';

/**
 * Customer catalogue (Mijozlar) API contract.
 *
 * Debt / paid / overdue are derived from Sale.remainingAmount and installment
 * rows — never from a mutable Customer.balance field.
 * Money is whole so'm. `storeId` is never accepted from the client.
 */

export type CustomerDebtStatus = 'CLEAR' | 'IN_DEBT' | 'OVERDUE';

export interface CustomerListItem {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  notes: string | null;
  address: string | null;
  status: CustomerStatus;
  debtStatus: CustomerDebtStatus;
  /** Sum of Sale.totalSalePrice for ACTIVE|COMPLETED sales. */
  totalPurchases: Money;
  /** Sum of Sale.paidAmount for ACTIVE|COMPLETED sales. */
  totalPaid: Money;
  /** Sum of Sale.remainingAmount for unsettled ACTIVE|COMPLETED sales. */
  outstandingDebt: Money;
  /** Overdue installment remaining on those sales. */
  overdueAmount: Money;
  openSaleCount: number;
  lastSaleAt: IsoDateString | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CustomerCatalogueSummary {
  totalCustomers: number;
  activeCount: number;
  archivedCount: number;
  customersInDebt: number;
  totalOutstanding: Money;
  overdueAmount: Money;
}

export type CustomerListStatusFilter = CustomerStatus | 'ALL';
export type CustomerDebtFilter = 'ALL' | 'CLEAR' | 'IN_DEBT' | 'OVERDUE';

export interface CustomerListQuery extends PaginationQuery {
  search?: string;
  status?: CustomerListStatusFilter;
  debtFilter?: CustomerDebtFilter;
  sort?: 'name' | 'debt' | 'lastSale';
}

export interface CustomerListResponse {
  summary: CustomerCatalogueSummary;
  items: CustomerListItem[];
  meta: PaginatedResult<CustomerListItem>['meta'];
}

export interface CustomerFinancialSummary {
  totalPurchases: Money;
  totalPaid: Money;
  outstandingDebt: Money;
  overdueAmount: Money;
  openSaleCount: number;
  revenueSaleCount: number;
  cancelledSaleCount: number;
}

export interface CustomerSaleHistoryItem {
  saleId: string;
  saleNumber: number;
  saleDate: IsoDateString;
  status: SaleStatus;
  totalSalePrice: Money;
  paidAmount: Money;
  remainingAmount: Money;
  productSummary: string;
  itemCount: number;
}

export interface CustomerPaymentHistoryItem {
  paymentId: string;
  saleId: string;
  saleNumber: number;
  amount: Money;
  method: PaymentMethod;
  paidAt: IsoDateString;
  note: string | null;
  recordedByName: string | null;
}

export interface CustomerInstallmentHistoryItem {
  installmentPaymentId: string;
  saleId: string;
  saleNumber: number;
  sequence: number;
  dueDate: IsoDateString;
  amount: Money;
  paidAmount: Money;
  remainingAmount: Money;
  status: InstallmentStatus;
  /** Display status including date-based overdue. */
  displayStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

export interface CustomerDetail extends CustomerListItem {
  financial: CustomerFinancialSummary;
  sales: CustomerSaleHistoryItem[];
  payments: CustomerPaymentHistoryItem[];
  installments: CustomerInstallmentHistoryItem[];
}

export interface CreateCustomerCatalogueRequest {
  firstName: string;
  lastName: string;
  phone: string;
  notes?: string | null;
  address?: string | null;
}

export interface UpdateCustomerRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  notes?: string | null;
  address?: string | null;
}

export type CustomerDetailResponse = { customer: CustomerDetail };
export type CustomerMutationResponse = { customer: CustomerListItem };
export type CustomerListApiResponse = CustomerListResponse;
