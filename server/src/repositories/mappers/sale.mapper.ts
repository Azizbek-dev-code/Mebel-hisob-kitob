import type {
  AssemblyTaskDto,
  InstallmentPlanDto,
  PaymentDto,
  SaleCustomerSummary,
  SaleDetail,
  SaleItemDto,
  SaleListItem,
  SaleWorkerCompensationDto,
  SaleWorkerPayRole,
  SaleWorkerPaySource,
  SaleWorkerSummary,
} from '@furniture-erp/shared';
import {
  SALE_WORKER_PAY_ROLE_RESPONSIBILITY,
} from '@furniture-erp/shared';
import type {
  AssemblyTask,
  Customer,
  InstallmentPayment,
  InstallmentPlan,
  Payment,
  Product,
  Sale,
  SaleItem,
  SaleWorkerCompensation,
  User,
} from '@prisma/client';

import { fromDbMoney } from '../../lib/money-mapper.js';

type UserRef = Pick<User, 'id' | 'fullName' | 'role'>;
type CustomerRef = Pick<Customer, 'id' | 'firstName' | 'lastName' | 'phone' | 'address'>;
type WorkerNameRef = Pick<User, 'id' | 'fullName'>;

export type SaleItemRecord = SaleItem & {
  product: Pick<Product, 'imageUrl'> | null;
};

export type PaymentRecord = Payment & {
  createdBy: UserRef | null;
};

export type InstallmentPlanRecord = InstallmentPlan & {
  payments: InstallmentPayment[];
};

export type AssemblyTaskRecord = AssemblyTask & {
  assignee: UserRef;
  assignedBy: UserRef | null;
  completedBy: UserRef | null;
  sale: Pick<Sale, 'id' | 'saleNumber'> & {
    customer: Pick<Customer, 'firstName' | 'lastName'>;
    items: Array<Pick<SaleItem, 'productName' | 'quantity'>>;
  };
};

export type SaleWorkerCompensationRecord = SaleWorkerCompensation & {
  worker: WorkerNameRef;
};

export type SaleListRecord = Sale & {
  customer: CustomerRef;
  seller: UserRef | null;
  items: Array<Pick<SaleItem, 'productName' | 'quantity'>>;
};

export type SaleDetailRecord = Sale & {
  customer: CustomerRef;
  seller: UserRef | null;
  installer: UserRef | null;
  deliveryPerson: UserRef | null;
  createdBy: UserRef | null;
  cancelledBy: UserRef | null;
  items: SaleItemRecord[];
  payments: PaymentRecord[];
  installmentPlan: InstallmentPlanRecord | null;
  assemblyTasks: AssemblyTaskRecord[];
  workerCompensations?: SaleWorkerCompensationRecord[];
};

function toWorker(user: UserRef | null | undefined): SaleWorkerSummary | null {
  if (!user) return null;
  return { id: user.id, fullName: user.fullName, role: user.role };
}

function toCustomer(customer: CustomerRef): SaleCustomerSummary {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    address: customer.address,
  };
}

export function productSummaryFromItems(
  items: Array<Pick<SaleItem, 'productName' | 'quantity'>>,
): string {
  if (items.length === 0) return '—';
  const [first, ...rest] = items;
  if (!first) return '—';
  if (rest.length === 0) return first.productName;
  return `${first.productName} +${rest.length}`;
}

export function toAssemblyTaskDto(task: AssemblyTaskRecord): AssemblyTaskDto {
  return {
    id: task.id,
    saleId: task.saleId,
    saleNumber: task.sale.saleNumber,
    status: task.status,
    assignedAt: task.assignedAt.toISOString(),
    deadline: task.deadline?.toISOString() ?? null,
    startedAt: task.startedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    notes: task.notes,
    assignee: toWorker(task.assignee)!,
    assignedBy: toWorker(task.assignedBy),
    completedBy: toWorker(task.completedBy),
    customerName: `${task.sale.customer.firstName} ${task.sale.customer.lastName}`.trim(),
    productSummary: productSummaryFromItems(task.sale.items),
  };
}

export function toPaymentDto(payment: PaymentRecord): PaymentDto {
  return {
    id: payment.id,
    amount: fromDbMoney(payment.amount),
    method: payment.method,
    paidAt: payment.paidAt.toISOString(),
    isDeposit: payment.isDeposit,
    note: payment.note,
    createdBy: toWorker(payment.createdBy),
    createdAt: payment.createdAt.toISOString(),
  };
}

function toInstallmentPlanDto(plan: InstallmentPlanRecord): InstallmentPlanDto {
  return {
    id: plan.id,
    totalSalePrice: fromDbMoney(plan.totalSalePrice),
    depositAmount: fromDbMoney(plan.depositAmount),
    financedAmount: fromDbMoney(plan.financedAmount),
    monthCount: plan.monthCount,
    monthlyAmount: fromDbMoney(plan.monthlyAmount),
    firstDueDate: plan.firstDueDate.toISOString(),
    status: plan.status,
    paidAmount: fromDbMoney(plan.paidAmount),
    remainingAmount: fromDbMoney(plan.remainingAmount),
    schedule: plan.payments
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((row) => ({
        id: row.id,
        sequence: row.sequence,
        dueDate: row.dueDate.toISOString(),
        amount: fromDbMoney(row.amount),
        paidAmount: fromDbMoney(row.paidAmount),
        remainingAmount: fromDbMoney(row.remainingAmount),
        status: row.status,
        paidAt: row.paidAt?.toISOString() ?? null,
      })),
  };
}

function toSaleItemDto(item: SaleItemRecord): SaleItemDto {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku,
    productImageUrl: item.product?.imageUrl ?? null,
    quantity: item.quantity,
    unitCostPrice: fromDbMoney(item.unitCostPrice),
    unitSalePrice: fromDbMoney(item.unitSalePrice),
    lineCostTotal: fromDbMoney(item.lineCostTotal),
    lineSaleTotal: fromDbMoney(item.lineSaleTotal),
  };
}

export function toSaleListItem(sale: SaleListRecord): SaleListItem {
  return {
    id: sale.id,
    saleNumber: sale.saleNumber,
    saleDate: sale.saleDate.toISOString(),
    status: sale.status,
    customer: toCustomer(sale.customer),
    productSummary: productSummaryFromItems(sale.items),
    itemCount: sale.items.length,
    seller: toWorker(sale.seller),
    totalSalePrice: fromDbMoney(sale.totalSalePrice),
    paidAmount: fromDbMoney(sale.paidAmount),
    remainingAmount: fromDbMoney(sale.remainingAmount),
    paymentStatus: sale.paymentStatus,
    paymentType: sale.paymentType,
    assemblyStatus: sale.assemblyStatus,
    deliveryStatus: sale.deliveryStatus,
    installationStatus: sale.installationStatus,
    cancelledAt: sale.cancelledAt?.toISOString() ?? null,
  };
}

function toWorkerCompensationDto(
  row: SaleWorkerCompensationRecord,
): SaleWorkerCompensationDto {
  const role = row.role as SaleWorkerPayRole;
  return {
    id: row.id,
    role,
    workerId: row.workerId,
    worker: { id: row.worker.id, fullName: row.worker.fullName },
    amount: fromDbMoney(row.amount),
    source: row.source as SaleWorkerPaySource,
    responsibility: SALE_WORKER_PAY_ROLE_RESPONSIBILITY[role],
  };
}

export function toSaleDetail(
  sale: SaleDetailRecord,
  options?: {
    workerCompensationLocked?: boolean;
    sellerCommissionEstimate?: number;
    sellerCommissionRateLabel?: string | null;
  },
): SaleDetail {
  const assemblyTasks = sale.assemblyTasks
    .slice()
    .sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime())
    .map(toAssemblyTaskDto);

  const activeAssemblyTask =
    assemblyTasks.find((task) => task.status === 'PENDING' || task.status === 'IN_PROGRESS') ??
    null;

  const workerCompensation = (sale.workerCompensations ?? []).map(toWorkerCompensationDto);
  const manualPayTotal = workerCompensation
    .filter((row) => row.source === 'MANUAL')
    .reduce((sum, row) => sum + row.amount, 0);
  const grossProfit = fromDbMoney(sale.grossProfit);
  const installationCost = fromDbMoney(sale.installationCost);
  const deliveryCost = fromDbMoney(sale.deliveryCost);

  return {
    ...toSaleListItem(sale),
    subtotal: fromDbMoney(sale.subtotal),
    discountAmount: fromDbMoney(sale.discountAmount),
    totalCostPrice: fromDbMoney(sale.totalCostPrice),
    depositAmount: fromDbMoney(sale.depositAmount),
    sellerBonus: fromDbMoney(sale.sellerBonus),
    installationCost,
    deliveryCost,
    assemblerFee: installationCost,
    driverFee: deliveryCost,
    otherCosts: fromDbMoney(sale.otherCosts),
    grossProfit,
    netProfit: fromDbMoney(sale.netProfit),
    sellerCommissionEstimate: options?.sellerCommissionEstimate ?? 0,
    sellerCommissionRateLabel: options?.sellerCommissionRateLabel ?? null,
    items: sale.items.map(toSaleItemDto),
    payments: sale.payments
      .slice()
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
      .map(toPaymentDto),
    installmentPlan: sale.installmentPlan ? toInstallmentPlanDto(sale.installmentPlan) : null,
    assembler: toWorker(sale.installer),
    deliveryPerson: toWorker(sale.deliveryPerson),
    createdBy: toWorker(sale.createdBy),
    cancelledBy: toWorker(sale.cancelledBy),
    cancellationReason: sale.cancellationReason,
    assemblyTasks,
    activeAssemblyTask,
    installationDate: sale.installationDate?.toISOString() ?? null,
    installationNotes: sale.installationNotes,
    deliveryDate: sale.deliveryDate?.toISOString() ?? null,
    deliveryAddress: sale.deliveryAddress,
    deliveryNotes: sale.deliveryNotes,
    notes: sale.notes,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
    workerCompensation,
    workerCompensationLocked: options?.workerCompensationLocked ?? false,
    contributionAfterWorkerPay: grossProfit - manualPayTotal,
  };
}
