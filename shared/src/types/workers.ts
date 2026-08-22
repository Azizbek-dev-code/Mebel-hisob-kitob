import type {
  AssemblyTaskStatus,
  SalePaymentStatus,
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

export interface WorkerSaleItem {
  id: string;
  saleNumber: number;
  saleDate: IsoDateString;
  customerName: string;
  productSummary: string;
  totalSalePrice: Money;
  paidAmount: Money;
  remainingAmount: Money;
  paymentStatus: SalePaymentStatus;
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
