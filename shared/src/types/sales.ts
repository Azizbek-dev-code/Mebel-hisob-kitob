import type {
  AssemblyTaskStatus,
  FulfilmentStatus,
  PaymentMethod,
  PaymentType,
  SalePaymentStatus,
  SaleStatus,
  UserRole,
  WorkerResponsibility,
} from '../constants/enums.js';
import type { IsoDateString, Money, PaginatedResult, PaginationQuery } from './api.js';
import type {
  SaleWorkerCompensationDto,
  SaleWorkerCompensationInput,
} from './sale-worker-compensation.js';

/**
 * Sales API contract.
 *
 * Money arrives as whole so'm numbers. Totals on a sale are the values the
 * accounting service already wrote — the client never recomputes them for
 * display of persisted records.
 *
 * Fee / worker pay note:
 * - Prefer API aliases `assemblerFee` / `driverFee` on create/update/detail.
 *   They map 1:1 to persisted `installationCost` (Usta haqqi) and `deliveryCost`
 *   (Shopir haqqi). Legacy names still accepted; alias wins when both are sent.
 * - Those costs feed `calculateSaleTotals` → `netProfit` (with sellerBonus /
 *   otherCosts). Seller % commission stays on WorkerCompensationRule — do not
 *   write it into `sellerBonus`.
 * - Optional `workerCompensation` (MANUAL Ish haqlari) is separate: compensation
 *   preview/settle only. Period P&L uses settled COMMISSION; do not double-subtract.
 */

export interface SaleCustomerSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string | null;
}

export interface SaleWorkerSummary {
  id: string;
  fullName: string;
  role: UserRole;
}

export interface SaleItemDto {
  id: string;
  productId: string | null;
  productName: string;
  productSku: string | null;
  productImageUrl: string | null;
  quantity: number;
  unitCostPrice: Money;
  unitSalePrice: Money;
  lineCostTotal: Money;
  lineSaleTotal: Money;
}

export interface PaymentDto {
  id: string;
  amount: Money;
  method: PaymentMethod;
  paidAt: IsoDateString;
  isDeposit: boolean;
  note: string | null;
  createdBy: SaleWorkerSummary | null;
  createdAt: IsoDateString;
}

export interface InstallmentPaymentDto {
  id: string;
  sequence: number;
  dueDate: IsoDateString;
  amount: Money;
  paidAmount: Money;
  remainingAmount: Money;
  status: string;
  paidAt: IsoDateString | null;
}

export interface InstallmentPlanDto {
  id: string;
  totalSalePrice: Money;
  depositAmount: Money;
  financedAmount: Money;
  monthCount: number;
  monthlyAmount: Money;
  firstDueDate: IsoDateString;
  status: string;
  paidAmount: Money;
  remainingAmount: Money;
  schedule: InstallmentPaymentDto[];
}

export interface AssemblyTaskDto {
  id: string;
  saleId: string;
  saleNumber: number;
  status: AssemblyTaskStatus;
  assignedAt: IsoDateString;
  deadline: IsoDateString | null;
  startedAt: IsoDateString | null;
  completedAt: IsoDateString | null;
  notes: string | null;
  assignee: SaleWorkerSummary;
  assignedBy: SaleWorkerSummary | null;
  completedBy: SaleWorkerSummary | null;
  customerName: string;
  productSummary: string;
}

export interface SaleListItem {
  id: string;
  saleNumber: number;
  saleDate: IsoDateString;
  status: SaleStatus;
  customer: SaleCustomerSummary;
  productSummary: string;
  itemCount: number;
  seller: SaleWorkerSummary | null;
  totalSalePrice: Money;
  paidAmount: Money;
  remainingAmount: Money;
  paymentStatus: SalePaymentStatus;
  paymentType: PaymentType;
  assemblyStatus: AssemblyTaskStatus | null;
  deliveryStatus: FulfilmentStatus;
  installationStatus: FulfilmentStatus;
  cancelledAt: IsoDateString | null;
}

export interface SaleDetail extends SaleListItem {
  subtotal: Money;
  discountAmount: Money;
  totalCostPrice: Money;
  depositAmount: Money;
  sellerBonus: Money;
  /** Persisted Usta haqqi (also exposed as `assemblerFee`). */
  installationCost: Money;
  /** Persisted Shopir haqqi (also exposed as `driverFee`). */
  deliveryCost: Money;
  /** Alias of `installationCost` — prefer in new UI. */
  assemblerFee: Money;
  /** Alias of `deliveryCost` — prefer in new UI. */
  driverFee: Money;
  otherCosts: Money;
  grossProfit: number;
  netProfit: number;
  /**
   * Read-only estimate from the seller's active WorkerCompensationRule
   * (PERCENT_OF_SALE / PERCENT_OF_GROSS_PROFIT / FIXED_PER_SALE). Not stored.
   */
  sellerCommissionEstimate: Money;
  /** e.g. "10%" or null when no active rule ("qoida yo'q"). */
  sellerCommissionRateLabel: string | null;
  items: SaleItemDto[];
  payments: PaymentDto[];
  installmentPlan: InstallmentPlanDto | null;
  assembler: SaleWorkerSummary | null;
  deliveryPerson: SaleWorkerSummary | null;
  createdBy: SaleWorkerSummary | null;
  cancelledBy: SaleWorkerSummary | null;
  cancellationReason: string | null;
  assemblyTasks: AssemblyTaskDto[];
  activeAssemblyTask: AssemblyTaskDto | null;
  installationDate: IsoDateString | null;
  installationNotes: string | null;
  deliveryDate: IsoDateString | null;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  notes: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  /** Manual (and any persisted) Ish haqlari rows for this sale. */
  workerCompensation: SaleWorkerCompensationDto[];
  /** True when any MANUAL line has been settled as COMMISSION. */
  workerCompensationLocked: boolean;
  /**
   * Display-only: grossProfit − sum(manual workerCompensation amounts).
   * Does not redefine `netProfit` (still uses sellerBonus / installationCost /
   * deliveryCost / otherCosts).
   */
  contributionAfterWorkerPay: Money;
}

export interface SaleLineInputDto {
  productId: string;
  quantity: number;
  /** Override the catalogue cost; defaults to the product's current cost. */
  unitCostPrice?: Money;
  /** Override the catalogue sale price. */
  unitSalePrice?: Money;
}

export interface CreateCustomerInlineDto {
  firstName: string;
  lastName: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface CreateSaleRequest {
  /** Existing customer, mutually exclusive with `newCustomer`. */
  customerId?: string;
  newCustomer?: CreateCustomerInlineDto;
  saleDate?: IsoDateString;
  sellerId?: string;
  items: SaleLineInputDto[];
  discountAmount?: Money;
  paymentType: PaymentType;
  /** Initial deposit / first payment taken at creation. */
  depositAmount?: Money;
  depositMethod?: PaymentMethod;
  /** Required when paymentType is INSTALLMENT and a balance remains after deposit. */
  installmentMonthCount?: number;
  installmentFirstDueDate?: IsoDateString;
  sellerBonus?: Money;
  /** Legacy name for Usta haqqi — prefer `assemblerFee`. */
  installationCost?: Money;
  /** Legacy name for Shopir haqqi — prefer `driverFee`. */
  deliveryCost?: Money;
  /** Usta haqqi → `installationCost`. */
  assemblerFee?: Money;
  /** Shopir haqqi → `deliveryCost`. */
  driverFee?: Money;
  otherCosts?: Money;
  /** Worker who will assemble the furniture. Creates an AssemblyTask. */
  assemblerId?: string;
  assemblyDeadline?: IsoDateString;
  assemblyNotes?: string;
  installationRequired?: boolean;
  installationDate?: IsoDateString;
  installationNotes?: string;
  deliveryRequired?: boolean;
  deliveryPersonId?: string;
  deliveryDate?: IsoDateString;
  deliveryAddress?: string;
  deliveryNotes?: string;
  notes?: string;
  /** Optional Ish haqlari rows; omit means none on create. */
  workerCompensation?: SaleWorkerCompensationInput[];
}

export interface UpdateSaleRequest {
  saleDate?: IsoDateString;
  sellerId?: string | null;
  discountAmount?: Money;
  sellerBonus?: Money;
  /** Legacy name for Usta haqqi — prefer `assemblerFee`. */
  installationCost?: Money;
  /** Legacy name for Shopir haqqi — prefer `driverFee`. */
  deliveryCost?: Money;
  /** Usta haqqi → `installationCost`. Admin-only on update. */
  assemblerFee?: Money;
  /** Shopir haqqi → `deliveryCost`. Admin-only on update. */
  driverFee?: Money;
  otherCosts?: Money;
  assemblerId?: string | null;
  assemblyDeadline?: IsoDateString | null;
  assemblyNotes?: string | null;
  installationRequired?: boolean;
  installationStatus?: FulfilmentStatus;
  installationDate?: IsoDateString | null;
  installationNotes?: string | null;
  deliveryRequired?: boolean;
  deliveryStatus?: FulfilmentStatus;
  deliveryPersonId?: string | null;
  deliveryDate?: IsoDateString | null;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  notes?: string | null;
  /**
   * When the key is present, replaces MANUAL rows (empty array clears).
   * Rejected with 409 if any MANUAL line for this sale is already settled.
   */
  workerCompensation?: SaleWorkerCompensationInput[];
}

export interface AddPaymentRequest {
  amount: Money;
  method: PaymentMethod;
  paidAt?: IsoDateString;
  note?: string;
  /** When set, the payment is applied against this scheduled installment row. */
  installmentPaymentId?: string;
}

export interface AssignAssemblyRequest {
  assemblerId: string;
  deadline?: IsoDateString;
  notes?: string;
}

export interface UpdateAssemblyTaskRequest {
  status: AssemblyTaskStatus;
  notes?: string;
}

export interface SaleListQuery extends PaginationQuery {
  search?: string;
  paymentStatus?: SalePaymentStatus;
  sellerId?: string;
  assemblyStatus?: AssemblyTaskStatus;
  deliveryStatus?: FulfilmentStatus;
  /**
   * Sale lifecycle filter.
   * - omit / `OPEN`: ACTIVE + COMPLETED (default list behaviour)
   * - `CANCELLED`: voided sales only
   * - `ALL`: history including cancelled
   * - or a concrete SaleStatus
   */
  status?: SaleStatus | 'OPEN' | 'ALL';
  /** Inclusive calendar date YYYY-MM-DD. */
  from?: string;
  /** Inclusive calendar date YYYY-MM-DD. */
  to?: string;
}

export type SaleListResponse = PaginatedResult<SaleListItem>;

export interface SaleDetailResponse {
  sale: SaleDetail;
}

export interface CreateSaleResponse {
  sale: SaleDetail;
}

export interface AddPaymentResponse {
  sale: SaleDetail;
  payment: PaymentDto;
}

export interface AssemblyTaskListResponse {
  items: AssemblyTaskDto[];
}

export interface AssemblyTaskResponse {
  task: AssemblyTaskDto;
  sale: SaleDetail;
}

export interface CancelSaleRequest {
  /** Required free-text reason for audit. */
  reason: string;
}

export type CancelSaleResponse = {
  sale: SaleDetail;
};

/** Lightweight rows for searchable selectors on the sale form. */
export interface CustomerLookupItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string | null;
}

export interface ProductLookupItem {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  costPrice: Money;
  defaultSalePrice: Money;
  categoryName: string | null;
  /** On-hand units when trackStock is true. */
  stockQty: number;
  minStockQty: number;
  trackStock: boolean;
}

export interface WorkerLookupItem {
  id: string;
  fullName: string;
  role: UserRole;
  phone: string | null;
  responsibilities: WorkerResponsibility[];
}

export interface CustomerLookupResponse {
  items: CustomerLookupItem[];
}

export interface ProductLookupResponse {
  items: ProductLookupItem[];
}

export interface WorkerLookupResponse {
  items: WorkerLookupItem[];
}

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  phone: string;
  address?: string;
  notes?: string;
}

export interface CreateCustomerResponse {
  customer: CustomerLookupItem;
}

/** Display labels for payment methods — single source for UI copy. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  TRANSFER: 'Bank transfer',
  OTHER: 'Other',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  FULL_PAYMENT: 'Full payment',
  DEPOSIT: 'Deposit',
  INSTALLMENT: "Bo'lib to'lash",
};

export const ASSEMBLY_STATUS_LABELS: Record<AssemblyTaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const FULFILMENT_STATUS_LABELS: Record<FulfilmentStatus, string> = {
  NOT_REQUIRED: 'Not required',
  PENDING: 'Pending',
  SCHEDULED: 'Assigned',
  IN_TRANSIT: 'In transit',
  COMPLETED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const INSTALLATION_STATUS_LABELS: Record<FulfilmentStatus, string> = {
  NOT_REQUIRED: 'Not required',
  PENDING: 'Pending',
  SCHEDULED: 'Scheduled',
  IN_TRANSIT: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
