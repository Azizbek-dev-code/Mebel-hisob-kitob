import type {
  AssemblyTaskStatus,
  SalePaymentStatus,
  SaleStatus,
  UserRole,
  WorkerActivityType,
  WorkerResponsibility,
} from '../constants/enums.js';
import type { IsoDateString, Money, PaginatedResult, PaginationQuery } from './api.js';

export const WORKER_RESPONSIBILITY_LABELS: Record<WorkerResponsibility, string> = {
  SELLER: 'Seller',
  ASSEMBLER: 'Assembler',
  DELIVERY: 'Delivery',
  INSTALLER: 'Installer',
  SMM: 'SMM',
  OTHER: 'Other',
};

export const WORKER_ACTIVITY_LABELS: Record<WorkerActivityType, string> = {
  WORKER_CREATED: 'Worker created',
  WORKER_UPDATED: 'Worker updated',
  WORKER_ACTIVATED: 'Worker activated',
  WORKER_DEACTIVATED: 'Worker deactivated',
  PASSWORD_RESET: 'Password reset',
  SALE_CREATED: 'Sale created',
  SALE_CANCELLED: 'Sale cancelled',
  ASSEMBLY_ASSIGNED: 'Assembly assigned',
  ASSEMBLY_STARTED: 'Assembly started',
  ASSEMBLY_COMPLETED: 'Assembly completed',
  PAYMENT_RECORDED: 'Payment recorded',
};

export interface WorkerListItem {
  id: string;
  fullName: string;
  username: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  responsibilities: WorkerResponsibility[];
  createdAt: IsoDateString;
  salesCount: number;
  assemblyTaskCount: number;
  activeTaskCount: number;
  /** Completed assembly tasks (workforce table). */
  assemblyCompleted?: number;
  deliveryCompleted?: number;
  installationCompleted?: number;
  earned?: Money;
  paid?: Money;
  outstanding?: Money;
}

export interface WorkerStats {
  totalSales: number;
  salesThisMonth: number;
  salesToday: number;
  totalAssemblyTasks: number;
  completedAssemblyTasks: number;
  pendingAssemblyTasks: number;
  completedTasksThisMonth: number;
}

export interface WorkerDetail {
  id: string;
  fullName: string;
  username: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
  role: UserRole;
  isActive: boolean;
  responsibilities: WorkerResponsibility[];
  createdAt: IsoDateString;
  lastLoginAt: IsoDateString | null;
  stats: WorkerStats;
}

export interface WorkerActivityItem {
  id: string;
  type: WorkerActivityType;
  message: string | null;
  relatedSaleId: string | null;
  relatedTaskId: string | null;
  relatedPaymentId: string | null;
  actorName: string | null;
  createdAt: IsoDateString;
}

import type { SellerCommissionStatus } from './seller-ops.js';

export interface WorkerSaleItem {
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

export interface WorkerTaskItem {
  id: string;
  saleId: string;
  saleNumber: number;
  status: AssemblyTaskStatus;
  assignedAt: IsoDateString;
  deadline: IsoDateString | null;
  startedAt: IsoDateString | null;
  completedAt: IsoDateString | null;
  notes: string | null;
  customerName: string;
  productSummary: string;
}

export interface WorkerListQuery extends PaginationQuery {
  search?: string;
  isActive?: boolean;
  responsibility?: WorkerResponsibility;
}

export interface CreateWorkerRequest {
  firstName: string;
  lastName: string;
  username: string;
  phone?: string;
  password: string;
  responsibilities: WorkerResponsibility[];
  isActive?: boolean;
  notes?: string;
  email?: string;
}

export interface UpdateWorkerRequest {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  responsibilities?: WorkerResponsibility[];
  isActive?: boolean;
  notes?: string | null;
}

export interface ResetWorkerPasswordRequest {
  password: string;
}

export type WorkerListResponse = PaginatedResult<WorkerListItem>;

export interface WorkerDetailResponse {
  worker: WorkerDetail;
}

export interface WorkerStatsResponse {
  stats: WorkerStats;
}

export type WorkerSalesResponse = PaginatedResult<WorkerSaleItem>;

export interface WorkerTasksResponse {
  items: WorkerTaskItem[];
}

export interface WorkerActivityResponse {
  items: WorkerActivityItem[];
}

export interface CreateWorkerResponse {
  worker: WorkerDetail;
}

export interface UpdateWorkerResponse {
  worker: WorkerDetail;
}

export interface ResetWorkerPasswordResponse {
  ok: true;
}

export interface MyProfileResponse {
  worker: WorkerDetail;
}

export interface MyStatsResponse {
  stats: WorkerStats;
}

/**
 * Fee amounts posted to the worker ledger from operational documents
 * and compensation settle. Open COMMISSION rows only (reversals excluded).
 */
export type WorkerAttributedFeeKind =
  | 'SELLER_COMMISSION'
  | 'SELLER_BONUS'
  | 'ASSEMBLER_FEE'
  | 'INSTALLER_FEE'
  | 'DELIVERY_FEE'
  | 'PURCHASE_DRIVER_FEE'
  | 'MANUAL_COMMISSION';

export type WorkerAttributedFeeSource = 'SALE' | 'PURCHASE' | 'MANUAL';

export interface WorkerAttributedFeeItem {
  id: string;
  kind: WorkerAttributedFeeKind;
  source: WorkerAttributedFeeSource;
  amount: Money;
  /** Event date (saleDate / deliveredAt / purchaseDate). */
  occurredAt: IsoDateString;
  /** Sale or purchase id. */
  referenceId: string;
  /** Human-readable reference, e.g. sale #42 or purchase #7. */
  referenceLabel: string;
  /** Optional context (customer / supplier / product summary). */
  description: string | null;
  /** Source sale / purchase was cancelled after the fee was earned. */
  sourceCancelled: boolean;
  /** The physical service behind this fee reached COMPLETED. */
  workCompleted: boolean;
}

export interface WorkerAttributedFeesSummary {
  sellerBonusTotal: Money;
  assemblerFeeTotal: Money;
  installerFeeTotal: Money;
  deliveryFeeTotal: Money;
  purchaseDriverFeeTotal: Money;
  /** Admin-entered COMMISSION with no operational document ref. */
  manualFeeTotal: Money;
  grandTotal: Money;
  items: WorkerAttributedFeeItem[];
}

export interface WorkerAttributedFeesResponse {
  fees: WorkerAttributedFeesSummary;
}
