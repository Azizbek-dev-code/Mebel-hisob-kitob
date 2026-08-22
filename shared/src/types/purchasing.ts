import type {
  PaymentMethod,
  PurchasePaymentStatus,
  PurchaseStatus,
  SupplierStatus,
} from '../constants/enums.js';
import type { IsoDateString, Money, PaginatedResult, PaginationQuery } from './api.js';

/**
 * Supplier catalogue + purchase payables.
 *
 * Supplier debt = sum of Purchase.remainingAmount where status = ACTIVE.
 * Never a mutable Supplier.balance field.
 * Money is whole so'm. storeId is never accepted from the client.
 */

export interface SupplierListItem {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  status: SupplierStatus;
  totalPurchases: Money;
  totalPaid: Money;
  outstandingDebt: Money;
  openPurchaseCount: number;
  lastPurchaseAt: IsoDateString | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface SupplierCatalogueSummary {
  totalSuppliers: number;
  activeCount: number;
  archivedCount: number;
  suppliersInDebt: number;
  totalOutstanding: Money;
}

export type SupplierListStatusFilter = SupplierStatus | 'ALL';

export interface SupplierListQuery extends PaginationQuery {
  search?: string;
  status?: SupplierListStatusFilter;
  debtFilter?: 'ALL' | 'CLEAR' | 'IN_DEBT';
}

export interface SupplierListResponse {
  summary: SupplierCatalogueSummary;
  items: SupplierListItem[];
  meta: PaginatedResult<SupplierListItem>['meta'];
}

export interface SupplierPurchaseHistoryItem {
  purchaseId: string;
  purchaseNumber: number;
  purchaseDate: IsoDateString;
  totalCost: Money;
  paidAmount: Money;
  remainingAmount: Money;
  paymentStatus: PurchasePaymentStatus;
  status: PurchaseStatus;
}

export interface SupplierPaymentHistoryItem {
  paymentId: string;
  purchaseId: string;
  purchaseNumber: number;
  amount: Money;
  method: PaymentMethod;
  paidAt: IsoDateString;
  note: string | null;
  recordedByName: string | null;
}

export interface SupplierFinancialSummary {
  totalPurchases: Money;
  totalPaid: Money;
  outstandingDebt: Money;
  openPurchaseCount: number;
  revenuePurchaseCount: number;
  cancelledPurchaseCount: number;
}

export interface SupplierDetail extends SupplierListItem {
  financial: SupplierFinancialSummary;
  purchases: SupplierPurchaseHistoryItem[];
  payments: SupplierPaymentHistoryItem[];
}

export interface CreateSupplierRequest {
  name: string;
  phone?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierRequest {
  name?: string;
  phone?: string | null;
  notes?: string | null;
}

export type SupplierDetailResponse = { supplier: SupplierDetail };
export type SupplierMutationResponse = { supplier: SupplierListItem };
export type SupplierListApiResponse = SupplierListResponse;

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

export interface PurchaseItemInput {
  productId: string;
  quantity: number;
  unitCost: Money;
}

export interface CreatePurchaseRequest {
  supplierId: string;
  items: PurchaseItemInput[];
  /** Optional initial cash settlement (0 = full credit). */
  paidAmount?: Money;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
  purchaseDate?: IsoDateString;
}

export interface CreateSupplierPaymentRequest {
  amount: Money;
  method: PaymentMethod;
  note?: string | null;
  paidAt?: IsoDateString;
}

export interface CancelPurchaseRequest {
  reason: string;
}

export interface PurchaseListItem {
  id: string;
  purchaseNumber: number;
  purchaseDate: IsoDateString;
  supplierId: string;
  supplierName: string;
  totalCost: Money;
  paidAmount: Money;
  remainingAmount: Money;
  paymentStatus: PurchasePaymentStatus;
  status: PurchaseStatus;
  itemCount: number;
  createdAt: IsoDateString;
}

export interface PurchaseLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: Money;
  lineTotal: Money;
}

export interface PurchasePaymentItem {
  paymentId: string;
  amount: Money;
  method: PaymentMethod;
  paidAt: IsoDateString;
  note: string | null;
  recordedByName: string | null;
}

export interface PurchaseStockMovementItem {
  movementId: string;
  productId: string;
  productName: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  movementType: string;
  createdAt: IsoDateString;
}

export interface PurchaseDetail extends PurchaseListItem {
  notes: string | null;
  items: PurchaseLineItem[];
  payments: PurchasePaymentItem[];
  stockMovements: PurchaseStockMovementItem[];
  cancelledAt: IsoDateString | null;
  cancellationReason: string | null;
}

export type PurchaseListPaymentFilter =
  | 'ALL'
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED';

export interface PurchaseListQuery extends PaginationQuery {
  search?: string;
  paymentFilter?: PurchaseListPaymentFilter;
  supplierId?: string;
}

export interface PurchaseListResponse {
  items: PurchaseListItem[];
  meta: PaginatedResult<PurchaseListItem>['meta'];
}

export type PurchaseDetailResponse = { purchase: PurchaseDetail };
export type PurchaseMutationResponse = { purchase: PurchaseDetail };
export type PurchaseListApiResponse = PurchaseListResponse;
export type SupplierPaymentMutationResponse = {
  payment: PurchasePaymentItem;
  purchase: PurchaseDetail;
};

/** Store-wide supplier payable summary (Reports + supplier KPIs). */
export interface SupplierPayablesSummary {
  totalPurchases: Money;
  totalPaid: Money;
  totalOutstanding: Money;
  suppliersInDebt: number;
  openPurchaseCount: number;
}

export interface SupplierPayableRow {
  supplierId: string;
  supplierName: string;
  totalPurchases: Money;
  totalPaid: Money;
  outstandingDebt: Money;
  openPurchaseCount: number;
}

export interface ReportsSupplierPayables {
  generatedAt: IsoDateString;
  summary: SupplierPayablesSummary;
  items: SupplierPayableRow[];
}
