/**
 * Shopir (DELIVERY) operational panel — list + start/complete sale deliveries.
 * Reuses worker-operational-fees; does not invent a parallel ledger.
 */
import {
  FulfilmentStatus,
  PurchaseStatus,
  SaleStatus,
  UserRole,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
  WorkerResponsibility,
  computeWorkerEarnedTotal,
  computeWorkerPaidTotal,
  type MyDeliveriesResponse,
  type PurchaseDeliveryOpsItem,
  type SaleDeliveryOpsItem,
  type SaleDetail,
  type UpdatePurchaseDeliveryStatusRequest,
  type UpdatePurchaseDeliveryStatusResponse,
  type UpdateSaleDeliveryStatusRequest,
} from '@furniture-erp/shared';

import { fromDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';
import * as workerFinancialRepository from '../repositories/worker-financial.repository.js';
import * as workerRepository from '../repositories/worker.repository.js';
import { ApiError } from '../utils/api-error.js';
import * as saleService from './sale.service.js';
import * as workerOperationalFees from './worker-operational-fees.service.js';

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfUtcMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function isAdminRole(role: string): boolean {
  return role === UserRole.ADMIN || role === UserRole.PLATFORM_ADMIN;
}

function isPendingDelivery(status: FulfilmentStatus): boolean {
  return status === FulfilmentStatus.PENDING || status === FulfilmentStatus.SCHEDULED;
}

function isInProgressDelivery(status: FulfilmentStatus): boolean {
  return status === FulfilmentStatus.IN_TRANSIT;
}

async function ledgerStatusForSaleDelivery(
  storeId: string,
  saleId: string,
  fee: number,
  status: FulfilmentStatus,
): Promise<'PENDING' | 'POSTED' | 'REVERSED' | 'NONE'> {
  if (fee <= 0) return 'NONE';
  const open = await workerFinancialRepository.findOpenCommissionByRef(
    storeId,
    WorkerFinancialReferenceType.SALE,
    workerOperationalFees.DELIVERY_FEE_REF(saleId),
  );
  if (open) return 'POSTED';
  if (status === FulfilmentStatus.COMPLETED) {
    const any = await prisma.workerFinancialTransaction.findFirst({
      where: {
        storeId,
        type: WorkerFinancialTransactionType.COMMISSION,
        referenceId: workerOperationalFees.DELIVERY_FEE_REF(saleId),
      },
      select: { id: true },
    });
    return any ? 'REVERSED' : 'PENDING';
  }
  return 'PENDING';
}

async function ledgerStatusForPurchase(
  storeId: string,
  purchaseId: string,
  fee: number,
  delivered: boolean,
): Promise<'PENDING' | 'POSTED' | 'REVERSED' | 'NONE'> {
  if (fee <= 0) return 'NONE';
  const open = await workerFinancialRepository.findOpenCommissionByRef(
    storeId,
    WorkerFinancialReferenceType.PURCHASE,
    workerOperationalFees.PURCHASE_DRIVER_FEE_REF(purchaseId),
  );
  if (open) return 'POSTED';
  if (!delivered) return 'PENDING';
  const any = await prisma.workerFinancialTransaction.findFirst({
    where: {
      storeId,
      type: WorkerFinancialTransactionType.COMMISSION,
      referenceId: workerOperationalFees.PURCHASE_DRIVER_FEE_REF(purchaseId),
    },
    select: { id: true },
  });
  return any ? 'REVERSED' : 'PENDING';
}

export async function listMyDeliveries(
  storeId: string,
  workerId: string,
): Promise<MyDeliveriesResponse> {
  const worker = await workerRepository.findActiveWorkerWithResponsibility(
    storeId,
    workerId,
    WorkerResponsibility.DELIVERY,
  );
  if (!worker) {
    throw ApiError.forbidden('Delivery responsibility required');
  }

  const dayStart = startOfUtcDay();
  const monthStart = startOfUtcMonth();

  const [sales, purchases, financeAll, financeMonth] = await Promise.all([
    prisma.sale.findMany({
      where: {
        storeId,
        deliveryPersonId: workerId,
        deliveryStatus: { not: FulfilmentStatus.NOT_REQUIRED },
      },
      select: {
        id: true,
        saleNumber: true,
        saleDate: true,
        deliveryStatus: true,
        deliveryCost: true,
        deliveryDate: true,
        deliveryDueDate: true,
        deliveryAddress: true,
        customer: { select: { firstName: true, lastName: true, phone: true } },
      },
      orderBy: [{ deliveryDueDate: 'asc' }, { saleDate: 'desc' }],
      take: 200,
    }),
    prisma.purchase.findMany({
      where: { storeId, driverId: workerId },
      select: {
        id: true,
        purchaseNumber: true,
        purchaseDate: true,
        deliveredAt: true,
        driverFee: true,
        status: true,
        supplier: { select: { name: true } },
      },
      orderBy: { purchaseDate: 'desc' },
      take: 100,
    }),
    workerFinancialRepository.aggregateWorkerTotals({
      storeId,
      workerId,
      responsibility: WorkerResponsibility.DELIVERY,
    }),
    workerFinancialRepository.aggregateWorkerTotals({
      storeId,
      workerId,
      dateFrom: monthStart,
      responsibility: WorkerResponsibility.DELIVERY,
    }),
  ]);

  const saleDeliveries: SaleDeliveryOpsItem[] = [];
  let todayTotal = 0;
  let todayPending = 0;
  let todayInProgress = 0;
  let todayCompleted = 0;
  let todayEarned = 0;
  let monthTotal = 0;

  for (const sale of sales) {
    const status = sale.deliveryStatus as FulfilmentStatus;
    const fee = fromDbMoney(sale.deliveryCost);
    const ledgerStatus = await ledgerStatusForSaleDelivery(storeId, sale.id, fee, status);
    const dueOrSale = sale.deliveryDueDate ?? sale.saleDate;
    const isToday =
      dueOrSale >= dayStart || (sale.deliveryDate != null && sale.deliveryDate >= dayStart);
    const isMonth =
      dueOrSale >= monthStart || (sale.deliveryDate != null && sale.deliveryDate >= monthStart);

    if (isToday) {
      todayTotal += 1;
      if (isPendingDelivery(status)) todayPending += 1;
      else if (isInProgressDelivery(status)) todayInProgress += 1;
      else if (status === FulfilmentStatus.COMPLETED) {
        todayCompleted += 1;
        if (ledgerStatus === 'POSTED') todayEarned += fee;
      }
    }
    if (isMonth) monthTotal += 1;

    saleDeliveries.push({
      kind: 'SALE',
      id: sale.id,
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      customerName: `${sale.customer.firstName} ${sale.customer.lastName}`.trim(),
      customerPhone: sale.customer.phone,
      address: sale.deliveryAddress,
      saleDate: sale.saleDate.toISOString(),
      deliveryDueDate: sale.deliveryDueDate?.toISOString() ?? null,
      deliveryDate: sale.deliveryDate?.toISOString() ?? null,
      status,
      fee,
      ledgerStatus,
      hint:
        fee > 0 && status !== FulfilmentStatus.COMPLETED
          ? 'Shopir haqi yetkazib berish yakunlangandan keyin hisobga olinadi.'
          : fee > 0 && ledgerStatus === 'POSTED'
            ? 'Shopir haqi hisoblandi.'
            : null,
      canStart: isPendingDelivery(status),
      // Shopir workflow: start first, then complete from IN_TRANSIT.
      canComplete: isInProgressDelivery(status),
    });
  }

  const purchaseDeliveries: PurchaseDeliveryOpsItem[] = [];
  for (const p of purchases) {
    const fee = fromDbMoney(p.driverFee);
    const delivered = p.deliveredAt != null;
    const status: PurchaseDeliveryOpsItem['status'] =
      p.status === 'CANCELLED' && !delivered
        ? 'CANCELLED'
        : delivered
          ? 'COMPLETED'
          : 'PENDING';
    const ledgerStatus = await ledgerStatusForPurchase(storeId, p.id, fee, delivered);
    const canComplete =
      status === 'PENDING' && p.status !== 'CANCELLED' && Boolean(p.id);
    purchaseDeliveries.push({
      kind: 'PURCHASE',
      id: p.id,
      purchaseNumber: p.purchaseNumber,
      supplierName: p.supplier.name,
      date: p.purchaseDate.toISOString(),
      deliveredAt: p.deliveredAt?.toISOString() ?? null,
      purchaseStatus: p.status,
      status,
      fee,
      ledgerStatus,
      canStart: false,
      canComplete,
      hint:
        ledgerStatus === 'POSTED'
          ? 'Kirim shopir haqi hisobga olingan.'
          : status === 'PENDING' && fee > 0
            ? 'Shopir haqi yuk olib kelingandan (yakunlangandan) keyin hisobga olinadi.'
            : status === 'PENDING'
              ? 'Yukni olib kelib yakunlang.'
              : null,
    });
  }

  const monthEarned = computeWorkerEarnedTotal({
    totalBonuses: financeMonth.totalBonuses,
    totalCommissions: financeMonth.totalCommissions,
    totalAdvances: financeMonth.totalAdvances,
    totalDebt: financeMonth.totalDebt,
    totalPayments: financeMonth.totalPayments,
    totalAdjustments: financeMonth.totalAdjustments,
    reversalsByOriginalType: financeMonth.reversalsByOriginalType,
  });
  const monthPaid = computeWorkerPaidTotal({
    totalBonuses: financeMonth.totalBonuses,
    totalCommissions: financeMonth.totalCommissions,
    totalAdvances: financeMonth.totalAdvances,
    totalDebt: financeMonth.totalDebt,
    totalPayments: financeMonth.totalPayments,
    totalAdjustments: financeMonth.totalAdjustments,
    reversalsByOriginalType: financeMonth.reversalsByOriginalType,
  });

  return {
    kpis: {
      todayTotal,
      todayPending,
      todayInProgress,
      todayCompleted,
      todayEarned,
      monthTotal,
      monthEarned,
      monthPaid,
      // Outstanding is all-time DELIVERY-scoped balance (not month-only).
      monthOutstanding: financeAll.netFinancialPosition,
    },
    saleDeliveries,
    purchaseDeliveries,
  };
}

/**
 * Shopir (or admin) starts / completes a sale delivery.
 * COMPLETED → existing postDeliveryFeeOnComplete via updateSale (idempotent).
 */
export async function updateMySaleDeliveryStatus(
  storeId: string,
  actor: { id: string; role: string },
  saleId: string,
  input: UpdateSaleDeliveryStatusRequest,
): Promise<{ sale: SaleDetail; ledgerPosted: boolean; message: string }> {
  const next = input.status as FulfilmentStatus;
  if (next !== FulfilmentStatus.IN_TRANSIT && next !== FulfilmentStatus.COMPLETED) {
    throw ApiError.validation('Only IN_TRANSIT (start) or COMPLETED (finish) are allowed', [
      { field: 'status', message: 'Use IN_TRANSIT or COMPLETED' },
    ]);
  }

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, storeId },
    select: {
      id: true,
      saleNumber: true,
      status: true,
      deliveryStatus: true,
      deliveryPersonId: true,
      deliveryCost: true,
    },
  });
  if (!sale) throw ApiError.notFound('Sale not found');
  if (sale.status === SaleStatus.CANCELLED) {
    throw ApiError.badRequest('Cancelled sales cannot be delivered');
  }
  if (
    sale.deliveryStatus === FulfilmentStatus.NOT_REQUIRED ||
    sale.deliveryStatus === FulfilmentStatus.CANCELLED
  ) {
    throw ApiError.badRequest('This sale has no active delivery');
  }
  if (!sale.deliveryPersonId) {
    throw ApiError.badRequest('No delivery worker is assigned');
  }

  const admin = isAdminRole(actor.role);
  if (!admin) {
    if (sale.deliveryPersonId !== actor.id) {
      throw ApiError.forbidden('You can only update deliveries assigned to you');
    }
    const hasDelivery = await workerRepository.workerHasResponsibility(
      storeId,
      actor.id,
      WorkerResponsibility.DELIVERY,
    );
    if (!hasDelivery) {
      throw ApiError.forbidden('Delivery responsibility required');
    }
    const active = await workerRepository.findActiveWorkerInStore(storeId, actor.id);
    if (!active) throw ApiError.forbidden('Inactive workers cannot update deliveries');
  }

  const current = sale.deliveryStatus as FulfilmentStatus;

  if (next === FulfilmentStatus.IN_TRANSIT) {
    if (current === FulfilmentStatus.COMPLETED) {
      throw ApiError.badRequest('Completed delivery cannot be restarted');
    }
    if (current === FulfilmentStatus.IN_TRANSIT) {
      const detail = await saleService.getSale(storeId, saleId, actor);
      return {
        sale: detail,
        ledgerPosted: false,
        message: 'Yetkazib berish allaqachon boshlangan.',
      };
    }
    if (!isPendingDelivery(current)) {
      throw ApiError.badRequest(`Cannot start delivery from status ${current}`);
    }
  }

  if (next === FulfilmentStatus.COMPLETED) {
    if (current === FulfilmentStatus.COMPLETED) {
      const detail = await saleService.getSale(storeId, saleId, actor);
      const open = await workerFinancialRepository.findOpenCommissionByRef(
        storeId,
        WorkerFinancialReferenceType.SALE,
        workerOperationalFees.DELIVERY_FEE_REF(saleId),
      );
      return {
        sale: detail,
        ledgerPosted: Boolean(open),
        message: open
          ? 'Yetkazib berish allaqachon yakunlangan. Shopir haqi hisobda.'
          : 'Yetkazib berish allaqachon yakunlangan.',
      };
    }
    // Shopir must start first (IN_TRANSIT). Admin may complete from pending/scheduled.
    if (!admin && !isInProgressDelivery(current)) {
      throw ApiError.badRequest('Start the delivery before completing it');
    }
    if (!isPendingDelivery(current) && !isInProgressDelivery(current)) {
      throw ApiError.badRequest(`Cannot complete delivery from status ${current}`);
    }
  }

  const detail = await saleService.updateSale(storeId, actor, saleId, {
    deliveryStatus: next,
  });

  let ledgerPosted = false;
  if (next === FulfilmentStatus.COMPLETED) {
    const open = await workerFinancialRepository.findOpenCommissionByRef(
      storeId,
      WorkerFinancialReferenceType.SALE,
      workerOperationalFees.DELIVERY_FEE_REF(saleId),
    );
    ledgerPosted = Boolean(open);
  }

  const fee = fromDbMoney(sale.deliveryCost);
  const message =
    next === FulfilmentStatus.IN_TRANSIT
      ? 'Yetkazib berish boshlandi.'
      : ledgerPosted
        ? `Yetkazib berish yakunlandi. ${fee.toLocaleString('uz-UZ')} so‘m shopir haqi hisobga tushdi.`
        : fee > 0
          ? 'Yetkazib berish yakunlandi, lekin ishchi haqini hisoblashda xatolik yuz berdi yoki haq 0.'
          : 'Yetkazib berish yakunlandi.';

  return { sale: detail, ledgerPosted, message };
}

/**
 * Shopir (or admin) marks a kirim pickup as completed.
 * Sets deliveredAt if missing and posts DRIVER_FEE once.
 */
export async function updateMyPurchaseDeliveryStatus(
  storeId: string,
  actor: { id: string; role: string },
  purchaseId: string,
  input: UpdatePurchaseDeliveryStatusRequest,
): Promise<UpdatePurchaseDeliveryStatusResponse> {
  if (input.status !== 'COMPLETED') {
    throw ApiError.validation('Only COMPLETED is allowed for purchase deliveries', [
      { field: 'status', message: 'Use COMPLETED' },
    ]);
  }

  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, storeId },
    select: {
      id: true,
      purchaseNumber: true,
      status: true,
      driverId: true,
      driverFee: true,
      deliveredAt: true,
      supplier: { select: { name: true } },
    },
  });
  if (!purchase) throw ApiError.notFound('Purchase not found');
  if (purchase.status === PurchaseStatus.CANCELLED) {
    throw ApiError.badRequest('Cancelled purchases cannot be delivered');
  }
  if (!purchase.driverId) {
    throw ApiError.badRequest('No delivery worker is assigned');
  }

  const admin = isAdminRole(actor.role);
  if (!admin) {
    if (purchase.driverId !== actor.id) {
      throw ApiError.forbidden('You can only update deliveries assigned to you');
    }
    const hasDelivery = await workerRepository.workerHasResponsibility(
      storeId,
      actor.id,
      WorkerResponsibility.DELIVERY,
    );
    if (!hasDelivery) {
      throw ApiError.forbidden('Delivery responsibility required');
    }
    const active = await workerRepository.findActiveWorkerInStore(storeId, actor.id);
    if (!active) throw ApiError.forbidden('Inactive workers cannot update deliveries');
  }

  const now = purchase.deliveredAt ?? new Date();
  await prisma.$transaction(async (tx) => {
    if (!purchase.deliveredAt) {
      await tx.purchase.update({
        where: { id: purchase.id },
        data: { deliveredAt: now },
      });
    }
    await workerOperationalFees.postPurchaseDriverFee({
      storeId,
      purchaseId: purchase.id,
      purchaseNumber: purchase.purchaseNumber,
      workerId: purchase.driverId,
      driverFee: fromDbMoney(purchase.driverFee),
      supplierName: purchase.supplier.name,
      actorId: actor.id,
      occurredAt: now,
      client: tx,
    });
  });

  const open = await workerFinancialRepository.findOpenCommissionByRef(
    storeId,
    WorkerFinancialReferenceType.PURCHASE,
    workerOperationalFees.PURCHASE_DRIVER_FEE_REF(purchase.id),
  );
  const fee = fromDbMoney(purchase.driverFee);
  const alreadyDone = Boolean(purchase.deliveredAt);
  const ledgerPosted = Boolean(open);
  const message = alreadyDone
    ? ledgerPosted
      ? 'Kirim yetkazib berish allaqachon yakunlangan. Shopir haqi hisobda.'
      : 'Kirim yetkazib berish allaqachon yakunlangan.'
    : ledgerPosted
      ? `Kirim yetkazib berish yakunlandi. ${fee.toLocaleString('uz-UZ')} so‘m shopir haqi hisobga tushdi.`
      : fee > 0
        ? 'Kirim yetkazib berish yakunlandi, lekin ishchi haqini hisoblashda xatolik yuz berdi yoki haq 0.'
        : 'Kirim yetkazib berish yakunlandi.';

  return {
    purchaseId: purchase.id,
    purchaseNumber: purchase.purchaseNumber,
    deliveredAt: now.toISOString(),
    ledgerPosted,
    message,
  };
}
