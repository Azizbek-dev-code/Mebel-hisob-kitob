import {
  ACTIVE_ASSEMBLY_TASK_STATUSES,
  AssemblyTaskStatus,
  AuditEntityType,
  AuditEventType,
  buildPaginationMeta,
  calculateSaleTotals,
  deriveInstallmentStatus,
  deriveSalePaymentStatus,
  estimateSellerCommission,
  FulfilmentStatus,
  generateInstallmentSchedule,
  FeatureKey,
  LimitResourceKey,
  InstallmentPlanStatus,
  installmentRemaining,
  normalisePagination,
  PaymentMethod,
  PaymentType,
  resolveSaleFeeAliases,
  SALE_WORKER_PAY_ROLE_LABELS,
  SALE_WORKER_PAY_ROLE_RESPONSIBILITY,
  SaleStatus,
  SaleWorkerPayRole,
  SaleWorkerPaySource,
  subtractMoney,
  sumMoney,
  toMoney,
  UserRole,
  WorkerActivityType,
  WorkerResponsibility,
  type AddPaymentRequest,
  type AssignAssemblyRequest,
  type CancelSaleRequest,
  type CreateSaleRequest,
  type PaymentDto,
  type SaleDetail,
  type SaleListItem,
  type SalePaymentStatus,
  type SaleWorkerCompensationInput,
  type UpdateAssemblyTaskRequest,
  type UpdateSaleRequest,
} from '@furniture-erp/shared';
import type { Prisma } from '@prisma/client';

import { parseFlexibleDate, parseFlexibleDateOrNull } from '../lib/date-input.js';
import { fromDbMoney, toDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';
import * as customerRepository from '../repositories/customer.repository.js';
import { toAssemblyTaskDto, toSaleDetail, toSaleListItem } from '../repositories/mappers/sale.mapper.js';
import * as productRepository from '../repositories/product.repository.js';
import * as inventoryService from './inventory.service.js';
import * as saleRepository from '../repositories/sale.repository.js';
import * as workerCompensationRepository from '../repositories/worker-compensation.repository.js';
import * as workerFinancialRepository from '../repositories/worker-financial.repository.js';
import * as workerRepository from '../repositories/worker.repository.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';
import { assertCanCreateResource, assertCanUseFeature } from './entitlement.service.js';

/**
 * Sales, payments and assembly assignments.
 *
 * Every write that touches more than one row runs inside a Prisma transaction.
 * Money is never recalculated ad-hoc: `calculateSaleTotals` and the installment
 * helpers from shared are the only accounting engines used here.
 */

export interface ListSalesOptions {
  storeId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  paymentStatus?: SalePaymentStatus;
  sellerId?: string;
  assemblyStatus?: AssemblyTaskStatus;
  deliveryStatus?: FulfilmentStatus;
  status?: SaleStatus | 'OPEN' | 'ALL';
  from?: string;
  to?: string;
}

const SALE_CANCEL_MANAGERS: ReadonlySet<string> = new Set([
  UserRole.ADMIN,
  UserRole.PLATFORM_ADMIN,
]);

const SALE_COST_FEE_MANAGERS: ReadonlySet<string> = new Set([
  UserRole.ADMIN,
  UserRole.PLATFORM_ADMIN,
]);

export function canCancelSale(role: string): boolean {
  return SALE_CANCEL_MANAGERS.has(role);
}

export function assertCanCancelSale(role: string): void {
  if (!canCancelSale(role)) {
    throw ApiError.forbidden('Only store administrators can cancel sales');
  }
}

export function canEditSaleCostFees(role: string): boolean {
  return SALE_COST_FEE_MANAGERS.has(role);
}

function assertCanEditSaleCostFees(role: string): void {
  if (!canEditSaleCostFees(role)) {
    throw ApiError.forbidden('Only store administrators can change sale cost fees');
  }
}

/** True when the patch touches admin-gated cost fields (usta/shopir/bonus/other). */
function updateTouchesSaleCostFees(input: UpdateSaleRequest): boolean {
  return (
    input.sellerBonus !== undefined ||
    input.installationCost !== undefined ||
    input.deliveryCost !== undefined ||
    input.assemblerFee !== undefined ||
    input.driverFee !== undefined ||
    input.otherCosts !== undefined
  );
}

async function buildSaleDetailResponse(storeId: string, saleId: string): Promise<SaleDetail> {
  const sale = await saleRepository.findSaleDetail(storeId, saleId);
  if (!sale) {
    throw ApiError.notFound('Sale not found');
  }
  const workerCompensationLocked =
    await workerFinancialRepository.hasSettledManualSaleWorkerPay(storeId, saleId);

  let sellerCommissionEstimate = 0;
  let sellerCommissionRateLabel: string | null = null;

  if (sale.sellerId) {
    const rules = await workerCompensationRepository.listRulesForWorker(
      storeId,
      sale.sellerId,
      { isActive: true },
    );
    const estimate = estimateSellerCommission({
      rules: rules.map((rule) => ({
        id: rule.id,
        type: rule.type,
        value: rule.value,
        isActive: rule.isActive,
        effectiveFrom: new Date(rule.effectiveFrom),
        effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : null,
      })),
      saleDate: sale.saleDate,
      totalSalePrice: fromDbMoney(sale.totalSalePrice),
      grossProfit: fromDbMoney(sale.grossProfit),
    });
    sellerCommissionEstimate = estimate.amount;
    sellerCommissionRateLabel = estimate.rateLabel;
  }

  return toSaleDetail(sale, {
    workerCompensationLocked,
    sellerCommissionEstimate,
    sellerCommissionRateLabel,
  });
}

function endOfExclusiveCalendarDay(dateYmd: string): Date {
  const [yearText = '0', monthText = '1', dayText = '1'] = dateYmd.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  // Exclusive upper bound: start of the next UTC noon day window.
  return new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));
}

async function assertWorkerWithResponsibility(
  storeId: string,
  userId: string,
  responsibility: (typeof WorkerResponsibility)[keyof typeof WorkerResponsibility],
  label: string,
): Promise<void> {
  const worker = await workerRepository.findActiveWorkerWithResponsibility(
    storeId,
    userId,
    responsibility,
  );
  if (!worker) {
    throw ApiError.badRequest(
      `${label} must be an active worker in this store with the ${responsibility} responsibility`,
    );
  }
}

const WORKER_PAY_ROLE_LABEL: Record<SaleWorkerPayRole, string> = {
  [SaleWorkerPayRole.SELLER]: SALE_WORKER_PAY_ROLE_LABELS.SELLER,
  [SaleWorkerPayRole.ASSEMBLER]: SALE_WORKER_PAY_ROLE_LABELS.ASSEMBLER,
  [SaleWorkerPayRole.DASTAFCHI]: SALE_WORKER_PAY_ROLE_LABELS.DASTAFCHI,
  [SaleWorkerPayRole.SHOPIR]: SALE_WORKER_PAY_ROLE_LABELS.SHOPIR,
};

async function assertWorkerCompensationInputs(
  storeId: string,
  rows: SaleWorkerCompensationInput[],
): Promise<void> {
  for (const row of rows) {
    const responsibility = SALE_WORKER_PAY_ROLE_RESPONSIBILITY[row.role];
    await assertWorkerWithResponsibility(
      storeId,
      row.workerId,
      responsibility,
      WORKER_PAY_ROLE_LABEL[row.role],
    );
  }
}

async function replaceManualWorkerCompensations(
  tx: Prisma.TransactionClient,
  options: {
    storeId: string;
    saleId: string;
    rows: SaleWorkerCompensationInput[];
  },
): Promise<void> {
  await tx.saleWorkerCompensation.deleteMany({
    where: {
      storeId: options.storeId,
      saleId: options.saleId,
      source: SaleWorkerPaySource.MANUAL,
    },
  });

  if (options.rows.length === 0) return;

  await tx.saleWorkerCompensation.createMany({
    data: options.rows.map((row) => ({
      storeId: options.storeId,
      saleId: options.saleId,
      workerId: row.workerId,
      role: row.role,
      source: SaleWorkerPaySource.MANUAL,
      amount: toDbMoney(row.amount),
    })),
  });
}

async function resolveCustomerId(
  tx: Prisma.TransactionClient,
  storeId: string,
  input: CreateSaleRequest,
): Promise<string> {
  if (input.customerId) {
    const existing = await tx.customer.findFirst({
      where: { id: input.customerId, storeId, status: 'ACTIVE' },
    });
    if (!existing) {
      throw ApiError.badRequest('Customer not found in this store');
    }
    return existing.id;
  }

  if (!input.newCustomer) {
    throw ApiError.badRequest('Select or create a customer');
  }

  const phoneOwner = await tx.customer.findUnique({
    where: { storeId_phone: { storeId, phone: input.newCustomer.phone } },
  });
  if (phoneOwner) {
    throw ApiError.conflict('A customer with this phone number already exists');
  }

  const created = await customerRepository.createCustomerTx(tx, storeId, input.newCustomer);
  return created.id;
}

function buildFulfilmentOnCreate(input: CreateSaleRequest): {
  installationStatus: FulfilmentStatus;
  installationDate: Date | undefined;
  installationNotes: string | undefined;
  deliveryStatus: FulfilmentStatus;
  deliveryDate: Date | undefined;
  deliveryAddress: string | undefined;
  deliveryNotes: string | undefined;
  deliveryPersonId: string | undefined;
} {
  const installationRequired = input.installationRequired ?? Boolean(input.assemblerId);
  const deliveryRequired = input.deliveryRequired ?? false;

  return {
    installationStatus: installationRequired ? FulfilmentStatus.PENDING : FulfilmentStatus.NOT_REQUIRED,
    installationDate: parseFlexibleDate(input.installationDate),
    installationNotes: input.installationNotes,
    deliveryStatus: deliveryRequired
      ? input.deliveryPersonId
        ? FulfilmentStatus.SCHEDULED
        : FulfilmentStatus.PENDING
      : FulfilmentStatus.NOT_REQUIRED,
    deliveryDate: parseFlexibleDate(input.deliveryDate),
    deliveryAddress: input.deliveryAddress,
    deliveryNotes: input.deliveryNotes,
    deliveryPersonId: deliveryRequired ? input.deliveryPersonId : undefined,
  };
}

export async function listSales(options: ListSalesOptions): Promise<{
  items: SaleListItem[];
  meta: ReturnType<typeof buildPaginationMeta>;
}> {
  const { page, pageSize, skip, take } = normalisePagination(options.page, options.pageSize);

  const from = options.from ? parseFlexibleDate(options.from) : undefined;
  const to = options.to ? endOfExclusiveCalendarDay(options.to) : undefined;

  if (from && to && from >= to) {
    throw ApiError.badRequest('The start date must not be after the end date');
  }

  const { items, totalItems } = await saleRepository.listSales({
    storeId: options.storeId,
    search: options.search,
    paymentStatus: options.paymentStatus,
    sellerId: options.sellerId,
    assemblyStatus: options.assemblyStatus,
    deliveryStatus: options.deliveryStatus,
    status: options.status,
    from,
    to,
    skip,
    take,
  });

  return {
    items: items.map(toSaleListItem),
    meta: buildPaginationMeta(page, pageSize, totalItems),
  };
}

export async function getSale(storeId: string, saleId: string): Promise<SaleDetail> {
  return buildSaleDetailResponse(storeId, saleId);
}

export async function createSale(
  storeId: string,
  actorId: string,
  input: CreateSaleRequest,
): Promise<SaleDetail> {
  await assertCanUseFeature(storeId, FeatureKey.SALES);
  await assertCanCreateResource(storeId, LimitResourceKey.SALES);
  if (input.paymentType === PaymentType.INSTALLMENT) {
    await assertCanUseFeature(storeId, FeatureKey.INSTALLMENT);
  }
  if (!input.items?.length) {
    throw ApiError.badRequest('Add at least one product');
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const products = await productRepository.findActiveProductsByIds(storeId, productIds);
  if (products.length !== productIds.length) {
    throw ApiError.badRequest('One or more products were not found in this store');
  }
  const productById = new Map(products.map((product) => [product.id, product]));

  const sellerId = input.sellerId ?? actorId;
  await assertWorkerWithResponsibility(storeId, sellerId, WorkerResponsibility.SELLER, 'Seller');

  if (input.assemblerId) {
    await assertWorkerWithResponsibility(
      storeId,
      input.assemblerId,
      WorkerResponsibility.ASSEMBLER,
      'Assembly worker',
    );
  }
  if (input.deliveryPersonId) {
    await assertWorkerWithResponsibility(
      storeId,
      input.deliveryPersonId,
      WorkerResponsibility.DELIVERY,
      'Delivery person',
    );
  }

  const workerCompensationRows = input.workerCompensation ?? [];
  if (workerCompensationRows.length > 0) {
    await assertWorkerCompensationInputs(storeId, workerCompensationRows);
  }

  const lineInputs = input.items.map((item) => {
    const product = productById.get(item.productId)!;
    return {
      product,
      quantity: item.quantity,
      unitCostPrice: toMoney(item.unitCostPrice ?? fromDbMoney(product.costPrice)),
      unitSalePrice: toMoney(item.unitSalePrice ?? fromDbMoney(product.defaultSalePrice)),
    };
  });

  const depositAmount = toMoney(input.depositAmount ?? 0);
  const feeCosts = resolveSaleFeeAliases(input);
  const totals = calculateSaleTotals({
    items: lineInputs.map((line) => ({
      quantity: line.quantity,
      unitCostPrice: line.unitCostPrice,
      unitSalePrice: line.unitSalePrice,
    })),
    discountAmount: input.discountAmount,
    depositAmount,
    costs: {
      sellerBonus: input.sellerBonus,
      installationCost: feeCosts.installationCost,
      deliveryCost: feeCosts.deliveryCost,
      otherCosts: input.otherCosts,
    },
  });

  if (input.paymentType === PaymentType.FULL_PAYMENT && depositAmount < totals.totalSalePrice) {
    // Full payment means the customer settles at the desk; anything less is a deposit sale.
    // We still allow recording a partial amount as DEPOSIT semantics if they chose FULL by mistake —
    // but we require the deposit to cover the total when FULL_PAYMENT is selected.
    throw ApiError.badRequest('Full payment requires the deposit to cover the sale total');
  }

  if (input.paymentType === PaymentType.INSTALLMENT) {
    const financed = subtractMoney(totals.totalSalePrice, totals.depositAmount);
    if (financed > 0 && !input.installmentMonthCount) {
      throw ApiError.badRequest('Installment sales need a month count');
    }
  }

  const fulfilment = buildFulfilmentOnCreate(input);
  const saleDate = parseFlexibleDate(input.saleDate) ?? new Date();

  const saleId = await prisma.$transaction(async (tx) => {
    const customerId = await resolveCustomerId(tx, storeId, input);
    const saleNumber = await saleRepository.nextSaleNumber(tx, storeId);

    const assemblyStatus = input.assemblerId ? AssemblyTaskStatus.PENDING : null;

    const sale = await tx.sale.create({
      data: {
        storeId,
        saleNumber,
        customerId,
        sellerId,
        installerId: input.assemblerId,
        deliveryPersonId: fulfilment.deliveryPersonId,
        createdById: actorId,
        saleDate,
        status: SaleStatus.ACTIVE,
        subtotal: toDbMoney(totals.subtotal),
        discountAmount: toDbMoney(totals.discountAmount),
        totalSalePrice: toDbMoney(totals.totalSalePrice),
        totalCostPrice: toDbMoney(totals.totalCostPrice),
        paymentType: input.paymentType,
        paymentStatus: totals.paymentStatus,
        depositAmount: toDbMoney(totals.depositAmount),
        paidAmount: toDbMoney(totals.paidAmount),
        remainingAmount: toDbMoney(totals.remainingAmount),
        sellerBonus: toDbMoney(totals.sellerBonus),
        installationCost: toDbMoney(totals.installationCost),
        deliveryCost: toDbMoney(totals.deliveryCost),
        otherCosts: toDbMoney(totals.otherCosts),
        grossProfit: toDbMoney(totals.grossProfit),
        netProfit: toDbMoney(totals.netProfit),
        assemblyStatus,
        installationStatus: fulfilment.installationStatus,
        installationDate: fulfilment.installationDate,
        installationNotes: fulfilment.installationNotes,
        deliveryStatus: fulfilment.deliveryStatus,
        deliveryDate: fulfilment.deliveryDate,
        deliveryAddress: fulfilment.deliveryAddress,
        deliveryNotes: fulfilment.deliveryNotes,
        notes: input.notes,
        items: {
          create: totals.lines.map((line, index) => {
            const source = lineInputs[index]!;
            return {
              storeId,
              productId: source.product.id,
              productName: source.product.name,
              productSku: source.product.sku,
              quantity: line.quantity,
              unitCostPrice: toDbMoney(line.unitCostPrice),
              unitSalePrice: toDbMoney(line.unitSalePrice),
              lineCostTotal: toDbMoney(line.lineCostTotal),
              lineSaleTotal: toDbMoney(line.lineSaleTotal),
            };
          }),
        },
      },
    });

    if (totals.depositAmount > 0) {
      await tx.payment.create({
        data: {
          storeId,
          saleId: sale.id,
          customerId,
          amount: toDbMoney(totals.depositAmount),
          method: input.depositMethod ?? PaymentMethod.CASH,
          paidAt: saleDate,
          isDeposit: true,
          createdById: actorId,
          note: 'Initial deposit',
        },
      });
    }

    if (input.paymentType === PaymentType.INSTALLMENT) {
      const financedAmount = subtractMoney(totals.totalSalePrice, totals.depositAmount);
      if (financedAmount > 0 && input.installmentMonthCount) {
        const firstDueDate =
          parseFlexibleDate(input.installmentFirstDueDate) ??
          new Date(saleDate.getFullYear(), saleDate.getMonth() + 1, saleDate.getDate());

        const schedule = generateInstallmentSchedule({
          financedAmount,
          monthCount: input.installmentMonthCount,
          firstDueDate,
        });

        await tx.installmentPlan.create({
          data: {
            storeId,
            saleId: sale.id,
            customerId,
            totalSalePrice: toDbMoney(totals.totalSalePrice),
            depositAmount: toDbMoney(totals.depositAmount),
            financedAmount: toDbMoney(schedule.financedAmount),
            monthCount: schedule.monthCount,
            monthlyAmount: toDbMoney(schedule.monthlyAmount),
            firstDueDate,
            status: InstallmentPlanStatus.ACTIVE,
            paidAmount: toDbMoney(0),
            remainingAmount: toDbMoney(schedule.financedAmount),
            payments: {
              create: schedule.schedule.map((row) => ({
                storeId,
                sequence: row.sequence,
                dueDate: row.dueDate,
                amount: toDbMoney(row.amount),
                paidAmount: toDbMoney(0),
                remainingAmount: toDbMoney(row.amount),
                status: 'PENDING',
              })),
            },
          },
        });
      }
    }

    if (input.assemblerId) {
      await tx.assemblyTask.create({
        data: {
          storeId,
          saleId: sale.id,
          assigneeId: input.assemblerId,
          assignedById: actorId,
          status: AssemblyTaskStatus.PENDING,
          assignedAt: new Date(),
          deadline: parseFlexibleDate(input.assemblyDeadline),
          notes: input.assemblyNotes,
        },
      });

      await workerRepository.recordActivity(
        {
          storeId,
          workerId: input.assemblerId,
          actorId,
          type: WorkerActivityType.ASSEMBLY_ASSIGNED,
          relatedSaleId: sale.id,
          message: `Assigned assembly for sale #${saleNumber}`,
        },
        tx,
      );
    }

    await workerRepository.recordActivity(
      {
        storeId,
        workerId: sellerId,
        actorId,
        type: WorkerActivityType.SALE_CREATED,
        relatedSaleId: sale.id,
        message: `Sale #${saleNumber} created`,
      },
      tx,
    );

    if (totals.depositAmount > 0) {
      await workerRepository.recordActivity(
        {
          storeId,
          workerId: actorId,
          actorId,
          type: WorkerActivityType.PAYMENT_RECORDED,
          relatedSaleId: sale.id,
          message: `Deposit recorded on sale #${saleNumber}`,
        },
        tx,
      );
    }

    await inventoryService.deductStockForSale(tx, {
      storeId,
      saleId: sale.id,
      saleNumber,
      actorId,
      lines: lineInputs.map((line) => ({
        productId: line.product.id,
        productName: line.product.name,
        quantity: line.quantity,
        trackStock: line.product.trackStock,
      })),
    });

    if (workerCompensationRows.length > 0) {
      await replaceManualWorkerCompensations(tx, {
        storeId,
        saleId: sale.id,
        rows: workerCompensationRows,
      });
    }

    return sale.id;
  });

  const sale = await getSale(storeId, saleId);

  await recordAudit({
    storeId,
    actorUserId: actorId,
    eventType: AuditEventType.SALE_CREATED,
    entityType: AuditEntityType.SALE,
    entityId: sale.id,
    summary: `Sale #${sale.saleNumber} created`,
    metadata: {
      totalSalePrice: sale.totalSalePrice,
      paidAmount: sale.paidAmount,
      customerId: sale.customer.id,
    },
  });

  if (sale.installmentPlan) {
    await recordAudit({
      storeId,
      actorUserId: actorId,
      eventType: AuditEventType.INSTALLMENT_CREATED,
      entityType: AuditEntityType.INSTALLMENT,
      entityId: sale.installmentPlan.id,
      summary: `Installment plan created for sale #${sale.saleNumber}`,
      metadata: { saleId: sale.id, monthCount: sale.installmentPlan.monthCount },
    });
  }

  if (sale.payments.some((payment) => payment.isDeposit)) {
    const deposit = sale.payments.find((payment) => payment.isDeposit);
    await recordAudit({
      storeId,
      actorUserId: actorId,
      eventType: AuditEventType.PAYMENT_CREATED,
      entityType: AuditEntityType.PAYMENT,
      entityId: deposit?.id ?? sale.id,
      summary: `Deposit recorded on sale #${sale.saleNumber}`,
      metadata: { saleId: sale.id, amount: deposit?.amount },
    });
  }

  return sale;
}

export async function updateSale(
  storeId: string,
  actor: { id: string; role: string },
  saleId: string,
  input: UpdateSaleRequest,
): Promise<SaleDetail> {
  const actorId = actor.id;
  const existing = await saleRepository.findSaleDetail(storeId, saleId);
  if (!existing) {
    throw ApiError.notFound('Sale not found');
  }
  if (existing.status === 'CANCELLED') {
    throw ApiError.badRequest('Cancelled sales cannot be edited');
  }

  if (updateTouchesSaleCostFees(input)) {
    assertCanEditSaleCostFees(actor.role);
  }

  const feePatch = resolveSaleFeeAliases(input);
  const resolvedInstallationCost = feePatch.installationCost;
  const resolvedDeliveryCost = feePatch.deliveryCost;

  if (input.sellerId) {
    await assertWorkerWithResponsibility(
      storeId,
      input.sellerId,
      WorkerResponsibility.SELLER,
      'Seller',
    );
  }
  if (input.assemblerId) {
    await assertWorkerWithResponsibility(
      storeId,
      input.assemblerId,
      WorkerResponsibility.ASSEMBLER,
      'Assembly worker',
    );
  }
  if (input.deliveryPersonId) {
    await assertWorkerWithResponsibility(
      storeId,
      input.deliveryPersonId,
      WorkerResponsibility.DELIVERY,
      'Delivery person',
    );
  }

  if (input.workerCompensation !== undefined) {
    await assertWorkerCompensationInputs(storeId, input.workerCompensation);
    const locked = await workerFinancialRepository.hasSettledManualSaleWorkerPay(
      storeId,
      saleId,
    );
    if (locked) {
      throw ApiError.conflict(
        'Worker pay for this sale is locked after settlement and cannot be edited',
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    const current = await saleRepository.findSaleForUpdate(tx, storeId, saleId);
    if (!current) {
      throw ApiError.notFound('Sale not found');
    }

    // Recalculate profit when cost-side fields change. Line items are not edited in Phase 5.
    const costsChanged =
      input.sellerBonus !== undefined ||
      resolvedInstallationCost !== undefined ||
      resolvedDeliveryCost !== undefined ||
      input.otherCosts !== undefined ||
      input.discountAmount !== undefined;

    let moneyPatch: Prisma.SaleUncheckedUpdateInput = {};

    if (costsChanged) {
      const items = await tx.saleItem.findMany({ where: { saleId, storeId } });
      const totals = calculateSaleTotals({
        items: items.map((item) => ({
          quantity: item.quantity,
          unitCostPrice: fromDbMoney(item.unitCostPrice),
          unitSalePrice: fromDbMoney(item.unitSalePrice),
        })),
        discountAmount:
          input.discountAmount !== undefined
            ? input.discountAmount
            : fromDbMoney(current.discountAmount),
        depositAmount: fromDbMoney(current.depositAmount),
        additionalPaidAmount: subtractMoney(
          fromDbMoney(current.paidAmount),
          fromDbMoney(current.depositAmount),
        ),
        costs: {
          sellerBonus:
            input.sellerBonus !== undefined ? input.sellerBonus : fromDbMoney(current.sellerBonus),
          installationCost:
            resolvedInstallationCost !== undefined
              ? resolvedInstallationCost
              : fromDbMoney(current.installationCost),
          deliveryCost:
            resolvedDeliveryCost !== undefined
              ? resolvedDeliveryCost
              : fromDbMoney(current.deliveryCost),
          otherCosts:
            input.otherCosts !== undefined ? input.otherCosts : fromDbMoney(current.otherCosts),
        },
      });

      // Preserve actual paid amount from payment history; only refresh derived fields.
      const paidAmount = fromDbMoney(current.paidAmount);
      const totalSalePrice = totals.totalSalePrice;
      const remainingAmount = subtractMoney(totalSalePrice, paidAmount);

      moneyPatch = {
        subtotal: toDbMoney(totals.subtotal),
        discountAmount: toDbMoney(totals.discountAmount),
        totalSalePrice: toDbMoney(totalSalePrice),
        totalCostPrice: toDbMoney(totals.totalCostPrice),
        sellerBonus: toDbMoney(totals.sellerBonus),
        installationCost: toDbMoney(totals.installationCost),
        deliveryCost: toDbMoney(totals.deliveryCost),
        otherCosts: toDbMoney(totals.otherCosts),
        grossProfit: toDbMoney(totals.grossProfit),
        netProfit: toDbMoney(totals.netProfit),
        remainingAmount: toDbMoney(remainingAmount),
        paymentStatus: deriveSalePaymentStatus(totalSalePrice, paidAmount),
      };
    }

    let installationStatus = current.installationStatus as FulfilmentStatus;
    if (input.installationRequired === false) {
      installationStatus = FulfilmentStatus.NOT_REQUIRED;
    } else if (input.installationRequired === true && installationStatus === FulfilmentStatus.NOT_REQUIRED) {
      installationStatus = FulfilmentStatus.PENDING;
    }
    if (input.installationStatus) {
      installationStatus = input.installationStatus;
    }

    let deliveryStatus = current.deliveryStatus as FulfilmentStatus;
    if (input.deliveryRequired === false) {
      deliveryStatus = FulfilmentStatus.NOT_REQUIRED;
    } else if (input.deliveryRequired === true && deliveryStatus === FulfilmentStatus.NOT_REQUIRED) {
      deliveryStatus = input.deliveryPersonId ? FulfilmentStatus.SCHEDULED : FulfilmentStatus.PENDING;
    }
    if (input.deliveryStatus) {
      deliveryStatus = input.deliveryStatus;
    }

    // Completing delivery without an explicit date must still be compensable —
    // stamp deliveryDate so FIXED_PER_DELIVERY preview can find the event.
    let deliveryDatePatch: Date | null | undefined;
    if (input.deliveryDate !== undefined) {
      deliveryDatePatch = parseFlexibleDateOrNull(input.deliveryDate);
    } else if (
      deliveryStatus === FulfilmentStatus.COMPLETED &&
      current.deliveryStatus !== FulfilmentStatus.COMPLETED &&
      current.deliveryDate == null
    ) {
      deliveryDatePatch = new Date();
    }

    if (input.assemblerId !== undefined) {
      await reassignAssemblyInTx(tx, {
        storeId,
        saleId,
        actorId,
        assemblerId: input.assemblerId,
        deadline: parseFlexibleDateOrNull(input.assemblyDeadline) ?? undefined,
        notes: input.assemblyNotes ?? undefined,
      });
    }

    const activeAssembler =
      input.assemblerId !== undefined
        ? input.assemblerId
        : current.installerId;

    const data: Prisma.SaleUncheckedUpdateInput = {
      ...moneyPatch,
      installationStatus,
      deliveryStatus,
    };

    if (input.saleDate !== undefined) data.saleDate = parseFlexibleDate(input.saleDate);
    if (input.sellerId !== undefined) data.sellerId = input.sellerId;
    if (input.assemblerId !== undefined) {
      data.installerId = input.assemblerId;
      data.assemblyStatus = input.assemblerId ? AssemblyTaskStatus.PENDING : null;
    }
    if (activeAssembler === null) {
      data.installerId = null;
      data.assemblyStatus = null;
    }
    if (input.deliveryPersonId !== undefined) {
      data.deliveryPersonId = input.deliveryPersonId;
    } else if (deliveryStatus === FulfilmentStatus.NOT_REQUIRED) {
      data.deliveryPersonId = null;
    }
    if (input.installationDate !== undefined) {
      data.installationDate = parseFlexibleDateOrNull(input.installationDate);
    }
    if (input.installationNotes !== undefined) data.installationNotes = input.installationNotes;
    if (deliveryDatePatch !== undefined) {
      data.deliveryDate = deliveryDatePatch;
    }
    if (input.deliveryAddress !== undefined) data.deliveryAddress = input.deliveryAddress;
    if (input.deliveryNotes !== undefined) data.deliveryNotes = input.deliveryNotes;
    if (input.notes !== undefined) data.notes = input.notes;

    await tx.sale.update({ where: { id: saleId }, data });

    if (input.workerCompensation !== undefined) {
      await replaceManualWorkerCompensations(tx, {
        storeId,
        saleId,
        rows: input.workerCompensation,
      });
    }
  });

  const sale = await getSale(storeId, saleId);
  await recordAudit({
    storeId,
    actorUserId: actorId,
    eventType: AuditEventType.SALE_UPDATED,
    entityType: AuditEntityType.SALE,
    entityId: sale.id,
    summary: `Sale #${sale.saleNumber} updated`,
  });
  return sale;
}

export async function addPayment(
  storeId: string,
  actorId: string,
  saleId: string,
  input: AddPaymentRequest,
): Promise<{ sale: SaleDetail; payment: PaymentDto }> {
  const amount = toMoney(input.amount);
  if (amount <= 0) {
    throw ApiError.badRequest('Payment amount must be greater than zero');
  }

  const { paymentId, installmentPaymentId: appliedInstallmentId } = await prisma.$transaction(
    async (tx) => {
    const sale = await saleRepository.findSaleForUpdate(tx, storeId, saleId);
    if (!sale) {
      throw ApiError.notFound('Sale not found');
    }
    if (sale.status === 'CANCELLED') {
      throw ApiError.badRequest('Cannot add a payment to a cancelled sale');
    }

    const remaining = fromDbMoney(sale.remainingAmount);
    if (amount > remaining) {
      throw ApiError.badRequest('Payment cannot exceed the remaining balance');
    }

    let installmentPaymentId: string | undefined = input.installmentPaymentId;

    if (installmentPaymentId) {
      const row = sale.installmentPlan?.payments.find((payment) => payment.id === installmentPaymentId);
      if (!row) {
        throw ApiError.badRequest('Installment row not found on this sale');
      }
    } else if (sale.installmentPlan) {
      // Apply to the earliest unsettled installment when none was specified.
      const next = sale.installmentPlan.payments.find(
        (row) => fromDbMoney(row.remainingAmount) > 0,
      );
      installmentPaymentId = next?.id;
    }

    const payment = await tx.payment.create({
      data: {
        storeId,
        saleId,
        customerId: sale.customerId,
        amount: toDbMoney(amount),
        method: input.method,
        paidAt: parseFlexibleDate(input.paidAt) ?? new Date(),
        isDeposit: false,
        note: input.note,
        createdById: actorId,
        installmentPaymentId,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, role: true } },
      },
    });

    const paidAmount = sumMoney(fromDbMoney(sale.paidAmount), amount);
    const totalSalePrice = fromDbMoney(sale.totalSalePrice);
    const remainingAmount = subtractMoney(totalSalePrice, paidAmount);
    const paymentStatus = deriveSalePaymentStatus(totalSalePrice, paidAmount);

    await tx.sale.update({
      where: { id: saleId },
      data: {
        paidAmount: toDbMoney(paidAmount),
        remainingAmount: toDbMoney(remainingAmount),
        paymentStatus,
        status:
          paymentStatus === 'PAID' && sale.status === 'ACTIVE' ? SaleStatus.COMPLETED : undefined,
      },
    });

    if (sale.installmentPlan && installmentPaymentId) {
      await applyPaymentToInstallment(tx, sale.installmentPlan.id, installmentPaymentId, amount);
    }

    await workerRepository.recordActivity(
      {
        storeId,
        workerId: actorId,
        actorId,
        type: WorkerActivityType.PAYMENT_RECORDED,
        relatedSaleId: saleId,
        relatedPaymentId: payment.id,
        message: 'Payment recorded',
      },
      tx,
    );

    return { paymentId: payment.id, installmentPaymentId };
  });

  const sale = await getSale(storeId, saleId);
  const payment = sale.payments.find((row) => row.id === paymentId);
  if (!payment) {
    throw ApiError.internal('Payment was created but could not be reloaded');
  }

  await recordAudit({
    storeId,
    actorUserId: actorId,
    eventType: AuditEventType.PAYMENT_CREATED,
    entityType: AuditEntityType.PAYMENT,
    entityId: payment.id,
    summary: `Payment recorded on sale #${sale.saleNumber}`,
    metadata: { saleId, amount: payment.amount, method: payment.method },
  });

  if (appliedInstallmentId) {
    await recordAudit({
      storeId,
      actorUserId: actorId,
      eventType: AuditEventType.INSTALLMENT_PAYMENT_CREATED,
      entityType: AuditEntityType.INSTALLMENT,
      entityId: appliedInstallmentId,
      summary: `Installment payment applied on sale #${sale.saleNumber}`,
      metadata: { saleId, paymentId: payment.id, amount: payment.amount },
    });
  }

  return { sale, payment };
}

async function applyPaymentToInstallment(
  tx: Prisma.TransactionClient,
  planId: string,
  installmentPaymentId: string,
  amount: number,
): Promise<void> {
  const row = await tx.installmentPayment.findFirst({
    where: { id: installmentPaymentId, planId },
  });
  if (!row) return;

  const paidAmount = sumMoney(fromDbMoney(row.paidAmount), amount);
  const remainingAmount = installmentRemaining(fromDbMoney(row.amount), paidAmount);
  const status = deriveInstallmentStatus(fromDbMoney(row.amount), paidAmount, row.dueDate);

  await tx.installmentPayment.update({
    where: { id: row.id },
    data: {
      paidAmount: toDbMoney(paidAmount),
      remainingAmount: toDbMoney(remainingAmount),
      status,
      paidAt: remainingAmount === 0 ? new Date() : row.paidAt,
    },
  });

  const plan = await tx.installmentPlan.findUnique({ where: { id: planId } });
  if (!plan) return;

  const refreshed = await tx.installmentPayment.findMany({ where: { planId } });
  const paid = sumMoney(...refreshed.map((payment) => fromDbMoney(payment.paidAmount)));
  const remaining = subtractMoney(fromDbMoney(plan.financedAmount), paid);

  await tx.installmentPlan.update({
    where: { id: planId },
    data: {
      paidAmount: toDbMoney(paid),
      remainingAmount: toDbMoney(remaining),
      status: remaining === 0 ? InstallmentPlanStatus.COMPLETED : InstallmentPlanStatus.ACTIVE,
    },
  });
}

async function reassignAssemblyInTx(
  tx: Prisma.TransactionClient,
  options: {
    storeId: string;
    saleId: string;
    actorId: string;
    assemblerId: string | null;
    deadline?: Date | null;
    notes?: string | null;
  },
): Promise<void> {
  const active = await saleRepository.findActiveAssemblyTasksForSale(
    tx,
    options.storeId,
    options.saleId,
  );

  if (!options.assemblerId) {
    if (active.length > 0) {
      await tx.assemblyTask.updateMany({
        where: { id: { in: active.map((task) => task.id) } },
        data: { status: AssemblyTaskStatus.CANCELLED },
      });
    }
    return;
  }

  const sameAssignee = active.find((task) => task.assigneeId === options.assemblerId);
  if (sameAssignee) {
    // Keep the existing active row; cancel any other stray actives.
    const others = active.filter((task) => task.id !== sameAssignee.id);
    if (others.length > 0) {
      await tx.assemblyTask.updateMany({
        where: { id: { in: others.map((task) => task.id) } },
        data: { status: AssemblyTaskStatus.CANCELLED },
      });
    }
    await tx.assemblyTask.update({
      where: { id: sameAssignee.id },
      data: {
        deadline: options.deadline === undefined ? undefined : options.deadline,
        notes: options.notes === undefined ? undefined : options.notes,
      },
    });
    return;
  }

  if (active.length > 0) {
    await tx.assemblyTask.updateMany({
      where: { id: { in: active.map((task) => task.id) } },
      data: { status: AssemblyTaskStatus.CANCELLED },
    });
  }

  await tx.assemblyTask.create({
    data: {
      storeId: options.storeId,
      saleId: options.saleId,
      assigneeId: options.assemblerId,
      assignedById: options.actorId,
      status: AssemblyTaskStatus.PENDING,
      assignedAt: new Date(),
      deadline: options.deadline ?? undefined,
      notes: options.notes ?? undefined,
    },
  });

  await workerRepository.recordActivity(
    {
      storeId: options.storeId,
      workerId: options.assemblerId,
      actorId: options.actorId,
      type: WorkerActivityType.ASSEMBLY_ASSIGNED,
      relatedSaleId: options.saleId,
      message: 'Assembly task assigned',
    },
    tx,
  );
}

export async function assignAssembly(
  storeId: string,
  actorId: string,
  saleId: string,
  input: AssignAssemblyRequest,
): Promise<SaleDetail> {
  await assertWorkerWithResponsibility(
    storeId,
    input.assemblerId,
    WorkerResponsibility.ASSEMBLER,
    'Assembly worker',
  );

  const sale = await saleRepository.findSaleDetail(storeId, saleId);
  if (!sale) {
    throw ApiError.notFound('Sale not found');
  }

  await prisma.$transaction(async (tx) => {
    await reassignAssemblyInTx(tx, {
      storeId,
      saleId,
      actorId,
      assemblerId: input.assemblerId,
      deadline: parseFlexibleDate(input.deadline),
      notes: input.notes,
    });

    await tx.sale.update({
      where: { id: saleId },
      data: {
        installerId: input.assemblerId,
        assemblyStatus: AssemblyTaskStatus.PENDING,
        installationStatus:
          sale.installationStatus === FulfilmentStatus.NOT_REQUIRED
            ? FulfilmentStatus.PENDING
            : undefined,
      },
    });
  });

  return getSale(storeId, saleId);
}

export async function listMyAssemblyTasks(storeId: string, userId: string) {
  const tasks = await saleRepository.listAssemblyTasksForWorker(storeId, userId);
  return tasks.map(toAssemblyTaskDto);
}

export async function updateAssemblyTask(
  storeId: string,
  actorId: string,
  taskId: string,
  input: UpdateAssemblyTaskRequest,
): Promise<{ task: ReturnType<typeof toAssemblyTaskDto>; sale: SaleDetail }> {
  const existing = await saleRepository.findAssemblyTaskInStore(storeId, taskId);
  if (!existing) {
    throw ApiError.notFound('Assembly task not found');
  }

  // A worker may only update their own active assignment; admins may update any.
  // Role matrix is still coarse in Phase 5 — employees cannot reassign others' tasks.
  const actor = await workerRepository.findActiveWorkerInStore(storeId, actorId);
  if (!actor) {
    throw ApiError.forbidden();
  }

  const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
  if (!isAdmin && existing.assigneeId !== actorId) {
    throw ApiError.forbidden('You can only update assembly tasks assigned to you');
  }

  if (existing.status === AssemblyTaskStatus.CANCELLED) {
    throw ApiError.badRequest('Cancelled assembly tasks cannot be updated');
  }

  if (
    input.status === AssemblyTaskStatus.CANCELLED &&
    !isAdmin
  ) {
    throw ApiError.forbidden('Only an admin can cancel an assembly task');
  }

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const data: Prisma.AssemblyTaskUpdateInput = {
      status: input.status,
      notes: input.notes === undefined ? undefined : input.notes,
    };

    if (input.status === AssemblyTaskStatus.IN_PROGRESS && !existing.startedAt) {
      data.startedAt = now;
    }

    if (input.status === AssemblyTaskStatus.COMPLETED) {
      data.completedAt = now;
      data.completedBy = { connect: { id: actorId } };
      if (!existing.startedAt) {
        data.startedAt = now;
      }
    }

    if (input.status === AssemblyTaskStatus.CANCELLED) {
      // Leave completedAt unset — cancellation is not completion.
    }

    await tx.assemblyTask.update({ where: { id: taskId }, data });

    const salePatch: Prisma.SaleUncheckedUpdateInput = {
      assemblyStatus: input.status === AssemblyTaskStatus.CANCELLED ? null : input.status,
    };

    if (input.status === AssemblyTaskStatus.COMPLETED) {
      salePatch.installationStatus = FulfilmentStatus.COMPLETED;
      salePatch.installationDate = now;
    }

    if (input.status === AssemblyTaskStatus.CANCELLED) {
      salePatch.installerId = null;
    }

    await tx.sale.update({ where: { id: existing.saleId }, data: salePatch });

    if (input.status === AssemblyTaskStatus.IN_PROGRESS) {
      await workerRepository.recordActivity(
        {
          storeId,
          workerId: existing.assigneeId,
          actorId,
          type: WorkerActivityType.ASSEMBLY_STARTED,
          relatedSaleId: existing.saleId,
          relatedTaskId: taskId,
          message: 'Assembly started',
        },
        tx,
      );
    }

    if (input.status === AssemblyTaskStatus.COMPLETED) {
      await workerRepository.recordActivity(
        {
          storeId,
          workerId: existing.assigneeId,
          actorId,
          type: WorkerActivityType.ASSEMBLY_COMPLETED,
          relatedSaleId: existing.saleId,
          relatedTaskId: taskId,
          message: 'Assembly completed',
        },
        tx,
      );
    }
  });

  const task = await saleRepository.findAssemblyTaskInStore(storeId, taskId);
  if (!task) {
    throw ApiError.notFound('Assembly task not found');
  }

  return {
    task: toAssemblyTaskDto(task),
    sale: await getSale(storeId, existing.saleId),
  };
}

export async function listSalePayments(storeId: string, saleId: string) {
  const sale = await getSale(storeId, saleId);
  return sale.payments;
}

/**
 * Controlled void — never hard-deletes the sale.
 * Excludes the sale from revenue/debt/compensation going forward while preserving
 * payment history for audit. Does not create refund payment rows (cash refunds
 * are a separate operational step when money was collected).
 */
export async function cancelSale(
  storeId: string,
  actor: { id: string; role: string },
  saleId: string,
  input: CancelSaleRequest,
): Promise<SaleDetail> {
  assertCanCancelSale(actor.role);

  const reason = input.reason.trim();
  if (reason.length < 3) {
    throw ApiError.validation('Cancellation reason is required', [
      { field: 'reason', message: 'Provide a cancellation reason (at least 3 characters)' },
    ]);
  }
  if (reason.length > 1000) {
    throw ApiError.validation('Cancellation reason is too long', [
      { field: 'reason', message: 'Cancellation reason must be at most 1000 characters' },
    ]);
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.sale.findFirst({
      where: { id: saleId, storeId },
      include: {
        items: {
          select: {
            productId: true,
            productName: true,
            quantity: true,
          },
        },
        installmentPlan: true,
        assemblyTasks: {
          where: { status: { in: [...ACTIVE_ASSEMBLY_TASK_STATUSES] } },
          select: { id: true },
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound('Sale not found');
    }
    if (existing.status === SaleStatus.CANCELLED) {
      throw ApiError.conflict('Sale is already cancelled');
    }

    const cancelledAt = new Date();

    const deliveryStatus =
      existing.deliveryStatus === FulfilmentStatus.NOT_REQUIRED ||
      existing.deliveryStatus === FulfilmentStatus.COMPLETED
        ? existing.deliveryStatus
        : FulfilmentStatus.CANCELLED;

    const installationStatus =
      existing.installationStatus === FulfilmentStatus.NOT_REQUIRED ||
      existing.installationStatus === FulfilmentStatus.COMPLETED
        ? existing.installationStatus
        : FulfilmentStatus.CANCELLED;

    await tx.sale.update({
      where: { id: existing.id },
      data: {
        status: SaleStatus.CANCELLED,
        cancelledAt,
        cancelledById: actor.id,
        cancellationReason: reason,
        assemblyStatus:
          existing.assemblyTasks.length > 0
            ? AssemblyTaskStatus.CANCELLED
            : existing.assemblyStatus === AssemblyTaskStatus.PENDING ||
                existing.assemblyStatus === AssemblyTaskStatus.IN_PROGRESS
              ? AssemblyTaskStatus.CANCELLED
              : existing.assemblyStatus,
        deliveryStatus,
        installationStatus,
        installerId:
          existing.assemblyTasks.length > 0 ? null : existing.installerId,
      },
    });

    if (existing.assemblyTasks.length > 0) {
      await tx.assemblyTask.updateMany({
        where: {
          storeId,
          saleId: existing.id,
          status: { in: [...ACTIVE_ASSEMBLY_TASK_STATUSES] },
        },
        data: { status: AssemblyTaskStatus.CANCELLED },
      });
    }

    if (existing.installmentPlan && existing.installmentPlan.status !== InstallmentPlanStatus.CANCELLED) {
      await tx.installmentPlan.update({
        where: { id: existing.installmentPlan.id },
        data: { status: InstallmentPlanStatus.CANCELLED },
      });
    }

    await inventoryService.restoreStockForCancelledSale(tx, {
      storeId,
      saleId: existing.id,
      saleNumber: existing.saleNumber,
      actorId: actor.id,
      items: existing.items,
    });

    const activityWorkerId = existing.sellerId ?? actor.id;
    await workerRepository.recordActivity(
      {
        storeId,
        workerId: activityWorkerId,
        actorId: actor.id,
        type: WorkerActivityType.SALE_CANCELLED,
        relatedSaleId: existing.id,
        message: `Sale #${existing.saleNumber} cancelled: ${reason}`,
      },
      tx,
    );
  });

  const sale = await getSale(storeId, saleId);
  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.SALE_CANCELLED,
    entityType: AuditEntityType.SALE,
    entityId: sale.id,
    summary: `Sale #${sale.saleNumber} cancelled`,
    metadata: { reason },
  });
  return sale;
}

// Re-export helper used by tests for rollback scenarios.
export const __test__ = {
  ACTIVE_ASSEMBLY_TASK_STATUSES,
};
