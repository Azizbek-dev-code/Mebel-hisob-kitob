/**
 * Aggregate worker profile modules — one response for Umumiy + responsibility tabs.
 * Does not invent new payroll; reads Sale / Assembly / Purchase / WorkerFinancialTransaction.
 */
import {
  AssemblyTaskStatus,
  DateRangePreset,
  FulfilmentStatus,
  SaleStatus,
  UserRole,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
  WorkerResponsibility,
  computeWorkerEarnedTotal,
  computeWorkerPaidTotal,
  formatBasisPointsAsPercentLabel,
  isPercentCompensationType,
  sellerCompensationTypeLabel,
  type SellerActiveRule,
  type WorkerProfileAssemblerModule,
  type WorkerProfileCommissionLine,
  type WorkerProfileDeliveryModule,
  type WorkerProfileFinanceSnapshot,
  type WorkerProfileInstallerModule,
  type WorkerProfileModuleTab,
  type WorkerProfileModules,
  type WorkerProfileResponsibilityBreakdown,
  type WorkerProfileSellerModule,
  type WorkerProfileSmmModule,
  type WorkerFeeReconciliation,
} from '@furniture-erp/shared';

import { resolveDashboardRange } from '../lib/date-range.js';
import { fromDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';
import * as workerCompensationRepository from '../repositories/worker-compensation.repository.js';
import * as workerFinancialRepository from '../repositories/worker-financial.repository.js';
import * as workerRepository from '../repositories/worker.repository.js';
import { ApiError } from '../utils/api-error.js';
import * as sellerCommissionService from './seller-commission.service.js';
import { assertCanManageWorkers } from './worker.service.js';

function startOfUtcMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function commissionRefKey(referenceType: string, referenceId: string): string {
  return `${referenceType}::${referenceId}`;
}

/**
 * Batch-load open + any COMMISSION rows for a set of operational fee refs.
 * Preserves findOpenCommissionByRef / findFirst semantics without N+1 loops.
 */
async function loadCommissionLedgerMaps(
  storeId: string,
  refs: Array<{ referenceType: string; referenceId: string }>,
): Promise<{ open: Set<string>; any: Set<string> }> {
  const open = new Set<string>();
  const any = new Set<string>();
  if (refs.length === 0) return { open, any };

  const referenceIds = [...new Set(refs.map((ref) => ref.referenceId))];
  const rows = await prisma.workerFinancialTransaction.findMany({
    where: {
      storeId,
      type: WorkerFinancialTransactionType.COMMISSION,
      referenceId: { in: referenceIds },
    },
    select: { referenceId: true, referenceType: true, isOpen: true },
    orderBy: { createdAt: 'asc' },
  });

  for (const row of rows) {
    if (!row.referenceId || !row.referenceType) continue;
    const key = commissionRefKey(row.referenceType, row.referenceId);
    any.add(key);
    // Match findOpenCommissionByRef: first open row in createdAt order.
    if (row.isOpen) open.add(key);
    // Also allow "any" lookups that omit referenceType (assembler path).
    any.add(`*::${row.referenceId}`);
  }
  return { open, any };
}

async function storeRange(
  storeId: string,
  preset: (typeof DateRangePreset)[keyof typeof DateRangePreset],
) {
  const store = await prisma.store.findFirst({
    where: { id: storeId },
    select: { timezone: true },
  });
  const timeZone = store?.timezone || 'Asia/Tashkent';
  return resolveDashboardRange(preset, {}, timeZone);
}

function tabsFor(responsibilities: WorkerResponsibility[]): WorkerProfileModuleTab[] {
  const tabs: WorkerProfileModuleTab[] = ['GENERAL'];
  if (responsibilities.includes(WorkerResponsibility.SELLER)) tabs.push('SELLER');
  if (responsibilities.includes(WorkerResponsibility.ASSEMBLER)) tabs.push('ASSEMBLER');
  if (responsibilities.includes(WorkerResponsibility.DELIVERY)) tabs.push('DELIVERY');
  if (responsibilities.includes(WorkerResponsibility.INSTALLER)) tabs.push('INSTALLER');
  if (responsibilities.includes(WorkerResponsibility.SMM)) tabs.push('SMM');
  if (responsibilities.includes(WorkerResponsibility.OTHER)) tabs.push('OTHER');
  return tabs;
}

function financeFromSummary(
  all: Awaited<ReturnType<typeof workerFinancialRepository.aggregateWorkerTotals>>,
  month: Awaited<ReturnType<typeof workerFinancialRepository.aggregateWorkerTotals>>,
): WorkerProfileFinanceSnapshot {
  const earned = computeWorkerEarnedTotal({
    totalBonuses: all.totalBonuses,
    totalCommissions: all.totalCommissions,
    totalAdvances: all.totalAdvances,
    totalDebt: all.totalDebt,
    totalPayments: all.totalPayments,
    totalAdjustments: all.totalAdjustments,
    reversalsByOriginalType: all.reversalsByOriginalType,
  });
  const paid = computeWorkerPaidTotal({
    totalBonuses: all.totalBonuses,
    totalCommissions: all.totalCommissions,
    totalAdvances: all.totalAdvances,
    totalDebt: all.totalDebt,
    totalPayments: all.totalPayments,
    totalAdjustments: all.totalAdjustments,
    reversalsByOriginalType: all.reversalsByOriginalType,
  });
  return {
    earned,
    paid,
    outstanding: all.netFinancialPosition,
    monthEarned: computeWorkerEarnedTotal({
      totalBonuses: month.totalBonuses,
      totalCommissions: month.totalCommissions,
      totalAdvances: month.totalAdvances,
      totalDebt: month.totalDebt,
      totalPayments: month.totalPayments,
      totalAdjustments: month.totalAdjustments,
      reversalsByOriginalType: month.reversalsByOriginalType,
    }),
    monthPaid: computeWorkerPaidTotal({
      totalBonuses: month.totalBonuses,
      totalCommissions: month.totalCommissions,
      totalAdvances: month.totalAdvances,
      totalDebt: month.totalDebt,
      totalPayments: month.totalPayments,
      totalAdjustments: month.totalAdjustments,
      reversalsByOriginalType: month.reversalsByOriginalType,
    }),
    monthAdvances: month.totalAdvances - (month.reversalsByOriginalType?.ADVANCE ?? 0),
    monthOutstanding: month.netFinancialPosition,
    bonuses: all.totalBonuses - (all.reversalsByOriginalType?.BONUS ?? 0),
    advances: all.totalAdvances - (all.reversalsByOriginalType?.ADVANCE ?? 0),
    debt: all.totalDebt - (all.reversalsByOriginalType?.DEBT ?? 0),
    adjustments: all.totalAdjustments - (all.reversalsByOriginalType?.ADJUSTMENT ?? 0),
    reversals: all.totalReversals,
    commissions: all.totalCommissions - (all.reversalsByOriginalType?.COMMISSION ?? 0),
  };
}

async function scopedLedgerFinance(
  storeId: string,
  workerId: string,
  responsibility: WorkerResponsibility,
) {
  const totals = await workerFinancialRepository.aggregateWorkerTotals({
    storeId,
    workerId,
    responsibility,
  });
  return {
    paid: computeWorkerPaidTotal({
      totalBonuses: totals.totalBonuses,
      totalCommissions: totals.totalCommissions,
      totalAdvances: totals.totalAdvances,
      totalDebt: totals.totalDebt,
      totalPayments: totals.totalPayments,
      totalAdjustments: totals.totalAdjustments,
      reversalsByOriginalType: totals.reversalsByOriginalType,
    }),
    outstanding: totals.netFinancialPosition,
  };
}

async function openCommissionAmount(
  storeId: string,
  workerId: string,
  responsibility: WorkerResponsibility | null,
): Promise<number> {
  const rows = await prisma.workerFinancialTransaction.findMany({
    where: {
      storeId,
      workerId,
      type: WorkerFinancialTransactionType.COMMISSION,
      isOpen: true,
      ...(responsibility ? { responsibility } : {}),
    },
    select: { amount: true },
  });
  return rows.reduce((sum, row) => sum + fromDbMoney(row.amount), 0);
}

async function sellerFinanceSnapshot(
  storeId: string,
  workerId: string,
  dateFrom?: Date,
) {
  const totals = await workerFinancialRepository.aggregateWorkerTotals({
    storeId,
    workerId,
    dateFrom,
    responsibility: WorkerResponsibility.SELLER,
  });
  const earned = computeWorkerEarnedTotal({
    totalBonuses: totals.totalBonuses,
    totalCommissions: totals.totalCommissions,
    totalAdvances: totals.totalAdvances,
    totalDebt: totals.totalDebt,
    totalPayments: totals.totalPayments,
    totalAdjustments: totals.totalAdjustments,
    reversalsByOriginalType: totals.reversalsByOriginalType,
  });
  const paid = computeWorkerPaidTotal({
    totalBonuses: totals.totalBonuses,
    totalCommissions: totals.totalCommissions,
    totalAdvances: totals.totalAdvances,
    totalDebt: totals.totalDebt,
    totalPayments: totals.totalPayments,
    totalAdjustments: totals.totalAdjustments,
    reversalsByOriginalType: totals.reversalsByOriginalType,
  });
  const commissions = totals.totalCommissions - (totals.reversalsByOriginalType?.COMMISSION ?? 0);
  const bonuses = totals.totalBonuses - (totals.reversalsByOriginalType?.BONUS ?? 0);
  return { earned, paid, outstanding: earned - paid, commissions, bonuses };
}

async function buildSellerModule(
  storeId: string,
  workerId: string,
): Promise<WorkerProfileSellerModule> {
  const [todayRange, monthRange] = await Promise.all([
    storeRange(storeId, DateRangePreset.TODAY),
    storeRange(storeId, DateRangePreset.THIS_MONTH),
  ]);
  const dayStart = todayRange.from;
  const monthStart = monthRange.from;

  const saleBase = {
    storeId,
    sellerId: workerId,
    status: { not: SaleStatus.CANCELLED },
  };

  const [
    salesToday,
    salesThisMonth,
    salesTotal,
    cancelledSales,
    todayAgg,
    monthAgg,
    totalAgg,
    monthMax,
    recentSaleRows,
    commissions,
    payments,
    rules,
    financeAll,
    financeMonth,
  ] = await Promise.all([
    prisma.sale.count({ where: { ...saleBase, saleDate: { gte: dayStart } } }),
    prisma.sale.count({ where: { ...saleBase, saleDate: { gte: monthStart } } }),
    prisma.sale.count({ where: saleBase }),
    prisma.sale.count({
      where: { storeId, sellerId: workerId, status: SaleStatus.CANCELLED },
    }),
    prisma.sale.aggregate({
      where: { ...saleBase, saleDate: { gte: dayStart } },
      _sum: { totalSalePrice: true, grossProfit: true, netProfit: true },
    }),
    prisma.sale.aggregate({
      where: { ...saleBase, saleDate: { gte: monthStart } },
      _sum: { totalSalePrice: true, grossProfit: true, netProfit: true },
    }),
    prisma.sale.aggregate({
      where: saleBase,
      _sum: { totalSalePrice: true, grossProfit: true, netProfit: true },
    }),
    prisma.sale.aggregate({
      where: { ...saleBase, saleDate: { gte: monthStart } },
      _max: { totalSalePrice: true },
    }),
    prisma.sale.findMany({
      where: { storeId, sellerId: workerId },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        items: { select: { productName: true }, take: 3 },
      },
      orderBy: { saleDate: 'desc' },
      take: 12,
    }),
    prisma.workerFinancialTransaction.findMany({
      where: {
        storeId,
        workerId,
        type: WorkerFinancialTransactionType.COMMISSION,
        OR: [
          { responsibility: WorkerResponsibility.SELLER },
          {
            referenceType: WorkerFinancialReferenceType.COMPENSATION,
            referenceId: { contains: 'PERCENT_' },
          },
          {
            referenceType: WorkerFinancialReferenceType.COMPENSATION,
            referenceId: { contains: 'FIXED_PER_SALE' },
          },
          {
            referenceType: WorkerFinancialReferenceType.COMPENSATION,
            referenceId: { contains: 'MANUAL:SELLER' },
          },
        ],
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    }),
    prisma.workerFinancialTransaction.findMany({
      where: {
        storeId,
        workerId,
        type: {
          in: [WorkerFinancialTransactionType.PAYMENT, WorkerFinancialTransactionType.REVERSAL],
        },
        responsibility: WorkerResponsibility.SELLER,
      },
      orderBy: { transactionDate: 'desc' },
      take: 50,
    }),
    workerCompensationRepository.listRulesForWorker(storeId, workerId, { isActive: true }),
    sellerFinanceSnapshot(storeId, workerId),
    sellerFinanceSnapshot(storeId, workerId, monthStart),
  ]);

  const salesAmountToday = fromDbMoney(todayAgg._sum.totalSalePrice ?? 0n);
  const salesAmountMonth = fromDbMoney(monthAgg._sum.totalSalePrice ?? 0n);
  const salesAmountTotal = fromDbMoney(totalAgg._sum.totalSalePrice ?? 0n);
  const grossProfitMonth = fromDbMoney(monthAgg._sum.grossProfit ?? 0n);
  const grossProfitTotal = fromDbMoney(totalAgg._sum.grossProfit ?? 0n);
  const netProfitMonth = fromDbMoney(monthAgg._sum.netProfit ?? 0n);
  const netProfitTotal = fromDbMoney(totalAgg._sum.netProfit ?? 0n);

  const lines: WorkerProfileCommissionLine[] = [];
  for (const row of commissions) {
    const reversal = await workerFinancialRepository.findReversalOf(storeId, row.id);
    const amount = fromDbMoney(row.amount);
    const ref = row.referenceId ?? '';
    const saleId = ref.includes(':') ? ref.split(':')[0]! : null;
    let ruleType: string | null = null;
    let rateLabel: string | null = null;
    let baseLabel: string | null = null;
    if (ref.includes('PERCENT_OF_SALE')) {
      ruleType = 'PERCENT_OF_SALE';
      baseLabel = 'Sotuv summasi';
    } else if (ref.includes('PERCENT_OF_GROSS_PROFIT')) {
      ruleType = 'PERCENT_OF_GROSS_PROFIT';
      baseLabel = 'Yalpi foyda';
    } else if (ref.includes('FIXED_PER_SALE')) {
      ruleType = 'FIXED_PER_SALE';
      baseLabel = "Qat'iy summa";
    } else if (ref.includes('MANUAL:SELLER')) {
      ruleType = 'MANUAL_SELLER';
      baseLabel = "Qo'lda";
    }

    const desc = row.description ?? '';
    const yalpiMatch = desc.match(/Yalpi foyda\s+([\d\s]+)/i);
    const sofMatch = desc.match(/Sof foyda\s+([\d\s]+)/i);
    const sotuvMatch = desc.match(/Sotuv\s+([\d\s]+)(?!\s*#)/i);
    const rateMatch = desc.match(/Stavka\s+([\d.]+)\s*%/i);
    if (yalpiMatch) baseLabel = `Yalpi foyda: ${yalpiMatch[1]!.trim()}`;
    else if (sofMatch) baseLabel = `Yalpi foyda: ${sofMatch[1]!.trim()}`;
    else if (sotuvMatch && ruleType === 'PERCENT_OF_SALE') {
      baseLabel = `Sotuv summasi: ${sotuvMatch[1]!.trim()}`;
    }
    if (rateMatch) rateLabel = `${rateMatch[1]}%`;

    const saleNum = desc.match(/Sotuv\s*#(\d+)/i)?.[1];
    lines.push({
      id: row.id,
      saleId,
      saleNumber: saleNum ? Number(saleNum) : null,
      description: row.description,
      ruleType,
      baseLabel,
      rateLabel,
      amount,
      status: reversal ? 'REVERSED' : 'OPEN',
      occurredAt: row.transactionDate.toISOString(),
    });
  }

  const now = new Date();
  const sellerRules = rules.filter(
    (rule) =>
      rule.responsibility === WorkerResponsibility.SELLER &&
      (!rule.effectiveTo || new Date(rule.effectiveTo) >= now),
  );
  const activeRules: SellerActiveRule[] = sellerRules.map((rule) => ({
    id: rule.id,
    type: rule.type,
    value: rule.value,
    rateLabel: isPercentCompensationType(rule.type)
      ? formatBasisPointsAsPercentLabel(rule.value)
      : `${rule.value}`,
    typeLabel: sellerCompensationTypeLabel(rule.type),
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
  }));

  const recentSales = await sellerCommissionService.decorateSellerSales(
    storeId,
    workerId,
    recentSaleRows.map((row) => ({
      id: row.id,
      saleNumber: row.saleNumber,
      saleDate: row.saleDate,
      status: row.status,
      totalSalePrice: row.totalSalePrice,
      totalCostPrice: row.totalCostPrice,
      grossProfit: row.grossProfit,
      netProfit: row.netProfit,
      paidAmount: row.paidAmount,
      remainingAmount: row.remainingAmount,
      customerName: `${row.customer.firstName} ${row.customer.lastName}`.trim(),
      productSummary: row.items.map((item) => item.productName).join(', ') || '—',
    })),
  );

  const calculatedTotal = recentSales
    .filter((row) => row.status !== SaleStatus.CANCELLED)
    .reduce((sum, row) => sum + row.estimatedCommission, 0);
  const pendingTotal = Math.max(0, calculatedTotal - financeAll.commissions);

  return {
    salesToday,
    salesThisMonth,
    salesTotal,
    salesAmountToday,
    salesAmountMonth,
    salesAmountTotal,
    grossProfitMonth,
    grossProfitTotal,
    netProfitMonth,
    netProfitTotal,
    averageSale: salesTotal > 0 ? Math.floor(salesAmountTotal / salesTotal) : 0,
    largestSaleMonth: fromDbMoney(monthMax._max.totalSalePrice ?? 0n),
    completedSales: salesTotal,
    cancelledSales,
    earnedTotal: financeAll.earned,
    earnedMonth: financeMonth.earned,
    pendingTotal,
    pendingMonth: Math.max(0, financeMonth.earned - financeMonth.commissions),
    calculatedTotal,
    calculatedMonth: financeMonth.commissions,
    paidTotal: financeAll.paid,
    paidMonth: financeMonth.paid,
    outstandingTotal: financeAll.outstanding,
    outstandingMonth: financeMonth.outstanding,
    bonusTotal: financeAll.bonuses,
    bonusMonth: financeMonth.bonuses,
    commissionTotal: financeAll.commissions,
    activeRules,
    recentSales,
    commissions: lines,
    payments: payments
      .filter((row) => {
        if (row.type === WorkerFinancialTransactionType.PAYMENT) return true;
        return row.reversesType === WorkerFinancialTransactionType.PAYMENT;
      })
      .map((row) => ({
        id: row.id,
        amount: fromDbMoney(row.amount),
        transactionDate: row.transactionDate.toISOString(),
        description: row.description,
        type: row.type === WorkerFinancialTransactionType.PAYMENT ? 'PAYMENT' : 'REVERSAL',
      })),
  };
}

async function buildAssemblerModule(
  storeId: string,
  workerId: string,
): Promise<WorkerProfileAssemblerModule> {
  const monthStart = startOfUtcMonth();
  const tasks = await prisma.assemblyTask.findMany({
    where: { storeId, assigneeId: workerId },
    include: {
      sale: {
        select: {
          id: true,
          saleNumber: true,
          installationCost: true,
          customer: { select: { firstName: true, lastName: true } },
          items: { select: { productName: true }, take: 3 },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  let pending = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  let completedThisMonth = 0;
  let feeTotal = 0;

  const feeRefs = tasks
    .filter((task) => fromDbMoney(task.sale.installationCost) > 0)
    .map((task) => ({
      referenceType: WorkerFinancialReferenceType.ASSEMBLY,
      referenceId: `${task.saleId}:ASSEMBLY_FEE`,
    }));
  const ledger = await loadCommissionLedgerMaps(storeId, feeRefs);

  const items = [];
  for (const task of tasks) {
    if (task.status === AssemblyTaskStatus.PENDING) pending += 1;
    else if (task.status === AssemblyTaskStatus.IN_PROGRESS) inProgress += 1;
    else if (task.status === AssemblyTaskStatus.COMPLETED) {
      completed += 1;
      if (task.completedAt && task.completedAt >= monthStart) completedThisMonth += 1;
    } else if (task.status === AssemblyTaskStatus.CANCELLED) cancelled += 1;

    const fee = fromDbMoney(task.sale.installationCost);
    let ledgerStatus: 'PENDING' | 'POSTED' | 'REVERSED' | 'NONE' = 'NONE';
    if (fee > 0) {
      const typedKey = commissionRefKey(
        WorkerFinancialReferenceType.ASSEMBLY,
        `${task.saleId}:ASSEMBLY_FEE`,
      );
      if (ledger.open.has(typedKey)) {
        ledgerStatus = 'POSTED';
        if (task.status === AssemblyTaskStatus.COMPLETED) feeTotal += fee;
      } else if (task.status === AssemblyTaskStatus.COMPLETED) {
        ledgerStatus = ledger.any.has(`*::${task.saleId}:ASSEMBLY_FEE`) ? 'REVERSED' : 'PENDING';
      } else {
        ledgerStatus = 'PENDING';
      }
    }

    items.push({
      id: task.id,
      saleId: task.saleId,
      saleNumber: task.sale.saleNumber,
      customerName: `${task.sale.customer.firstName} ${task.sale.customer.lastName}`,
      productSummary: task.sale.items.map((i) => i.productName).join(', ') || '—',
      status: task.status as AssemblyTaskStatus,
      assignedAt: task.createdAt.toISOString(),
      completedAt: task.completedAt?.toISOString() ?? null,
      assemblyFee: fee,
      ledgerStatus,
    });
  }

  const earned = await openCommissionAmount(storeId, workerId, WorkerResponsibility.ASSEMBLER);
  const scoped = await scopedLedgerFinance(storeId, workerId, WorkerResponsibility.ASSEMBLER);

  return {
    pending,
    inProgress,
    completed,
    cancelled,
    completedThisMonth,
    feeTotal: earned || feeTotal,
    paid: scoped.paid,
    outstanding: scoped.outstanding,
    tasks: items,
  };
}

async function buildDeliveryModule(
  storeId: string,
  workerId: string,
): Promise<WorkerProfileDeliveryModule> {
  const monthStart = startOfUtcMonth();
  const sales = await prisma.sale.findMany({
    where: {
      storeId,
      deliveryPersonId: workerId,
      deliveryStatus: { not: FulfilmentStatus.NOT_REQUIRED },
    },
    select: {
      id: true,
      saleNumber: true,
      deliveryStatus: true,
      deliveryCost: true,
      deliveryDate: true,
      deliveryAddress: true,
      deliveryDueDate: true,
      customer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { saleDate: 'desc' },
    take: 100,
  });

  let scheduled = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  let feeTotal = 0;
  let feeThisMonth = 0;

  const saleFeeRefs = sales
    .filter((sale) => fromDbMoney(sale.deliveryCost) > 0)
    .map((sale) => ({
      referenceType: WorkerFinancialReferenceType.SALE,
      referenceId: `${sale.id}:DELIVERY_FEE`,
    }));
  const saleLedger = await loadCommissionLedgerMaps(storeId, saleFeeRefs);

  const saleDeliveries = [];
  for (const sale of sales) {
    const status = sale.deliveryStatus as FulfilmentStatus;
    if (status === FulfilmentStatus.SCHEDULED || status === FulfilmentStatus.PENDING) scheduled += 1;
    else if (status === FulfilmentStatus.IN_TRANSIT) inProgress += 1;
    else if (status === FulfilmentStatus.COMPLETED) completed += 1;
    else if (status === FulfilmentStatus.CANCELLED) cancelled += 1;

    const fee = fromDbMoney(sale.deliveryCost);
    let ledgerStatus: 'PENDING' | 'POSTED' | 'REVERSED' | 'NONE' = 'NONE';
    if (fee > 0) {
      const key = commissionRefKey(WorkerFinancialReferenceType.SALE, `${sale.id}:DELIVERY_FEE`);
      if (saleLedger.open.has(key)) {
        ledgerStatus = 'POSTED';
        feeTotal += fee;
        if (sale.deliveryDate && sale.deliveryDate >= monthStart) feeThisMonth += fee;
      } else if (status === FulfilmentStatus.COMPLETED) {
        ledgerStatus = 'REVERSED';
      } else {
        ledgerStatus = 'PENDING';
      }
    }

    saleDeliveries.push({
      id: sale.id,
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      customerName: `${sale.customer.firstName} ${sale.customer.lastName}`,
      address: sale.deliveryAddress,
      deliveryDate: (sale.deliveryDate ?? sale.deliveryDueDate)?.toISOString() ?? null,
      status,
      fee,
      ledgerStatus,
      hint:
        fee > 0 && status !== FulfilmentStatus.COMPLETED
          ? 'Shopir haqi yetkazib berish yakunlangandan keyin hisobga olinadi.'
          : fee > 0 && status === FulfilmentStatus.COMPLETED && ledgerStatus === 'POSTED'
            ? 'Shopir haqi hisoblandi.'
            : null,
    });
  }

  const purchases = await prisma.purchase.findMany({
    where: { storeId, driverId: workerId },
    select: {
      id: true,
      purchaseNumber: true,
      driverFee: true,
      purchaseDate: true,
      deliveredAt: true,
      status: true,
      supplier: { select: { name: true } },
    },
    orderBy: { purchaseDate: 'desc' },
    take: 50,
  });

  const purchaseFeeRefs = purchases
    .filter((p) => fromDbMoney(p.driverFee) > 0)
    .map((p) => ({
      referenceType: WorkerFinancialReferenceType.PURCHASE,
      referenceId: `${p.id}:DRIVER_FEE`,
    }));
  const purchaseLedger = await loadCommissionLedgerMaps(storeId, purchaseFeeRefs);

  const purchaseDeliveries = [];
  for (const p of purchases) {
    const fee = fromDbMoney(p.driverFee);
    const delivered = p.deliveredAt != null;
    const deliveryStatus: 'PENDING' | 'COMPLETED' | 'CANCELLED' =
      p.status === 'CANCELLED' && !delivered
        ? 'CANCELLED'
        : delivered
          ? 'COMPLETED'
          : 'PENDING';
    if (deliveryStatus === 'PENDING') scheduled += 1;
    else if (deliveryStatus === 'COMPLETED') completed += 1;
    else cancelled += 1;

    let ledgerStatus: 'PENDING' | 'POSTED' | 'REVERSED' | 'NONE' = 'NONE';
    if (fee > 0) {
      const key = commissionRefKey(WorkerFinancialReferenceType.PURCHASE, `${p.id}:DRIVER_FEE`);
      if (purchaseLedger.open.has(key)) {
        ledgerStatus = 'POSTED';
        feeTotal += fee;
        if ((p.deliveredAt ?? p.purchaseDate) >= monthStart) feeThisMonth += fee;
      } else if (delivered) {
        ledgerStatus = purchaseLedger.any.has(key) || purchaseLedger.any.has(`*::${p.id}:DRIVER_FEE`)
          ? 'REVERSED'
          : 'PENDING';
      } else {
        ledgerStatus = 'PENDING';
      }
    }
    purchaseDeliveries.push({
      id: p.id,
      purchaseNumber: p.purchaseNumber,
      supplierName: p.supplier.name,
      driverFee: fee,
      date: p.purchaseDate.toISOString(),
      deliveredAt: p.deliveredAt?.toISOString() ?? null,
      status: p.status,
      deliveryStatus,
      ledgerStatus,
    });
  }

  const scoped = await scopedLedgerFinance(storeId, workerId, WorkerResponsibility.DELIVERY);
  const earned = await openCommissionAmount(storeId, workerId, WorkerResponsibility.DELIVERY);
  return {
    scheduled,
    inProgress,
    completed,
    cancelled,
    feeTotal: earned || feeTotal,
    feeThisMonth,
    paid: scoped.paid,
    outstanding: scoped.outstanding,
    saleDeliveries,
    purchaseDeliveries,
  };
}

async function buildInstallerModule(
  storeId: string,
  workerId: string,
): Promise<WorkerProfileInstallerModule> {
  const sales = await prisma.sale.findMany({
    where: {
      storeId,
      installerId: workerId,
      installationStatus: { not: FulfilmentStatus.NOT_REQUIRED },
    },
    select: {
      id: true,
      saleNumber: true,
      installerFee: true,
      installationStatus: true,
      installationDate: true,
      customer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { saleDate: 'desc' },
    take: 100,
  });

  let scheduled = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  let feeTotal = 0;
  const feeRefs = sales
    .filter((sale) => fromDbMoney(sale.installerFee) > 0)
    .map((sale) => ({
      referenceType: WorkerFinancialReferenceType.ASSEMBLY,
      referenceId: `${sale.id}:INSTALLER_FEE`,
    }));
  const ledger = await loadCommissionLedgerMaps(storeId, feeRefs);
  const installations = [];

  for (const sale of sales) {
    const status = sale.installationStatus as FulfilmentStatus;
    if (status === FulfilmentStatus.SCHEDULED || status === FulfilmentStatus.PENDING) scheduled += 1;
    else if (status === FulfilmentStatus.IN_TRANSIT) inProgress += 1;
    else if (status === FulfilmentStatus.COMPLETED) completed += 1;
    else if (status === FulfilmentStatus.CANCELLED) cancelled += 1;

    const fee = fromDbMoney(sale.installerFee);
    let ledgerStatus: 'PENDING' | 'POSTED' | 'REVERSED' | 'NONE' = 'NONE';
    if (fee > 0) {
      const key = commissionRefKey(WorkerFinancialReferenceType.ASSEMBLY, `${sale.id}:INSTALLER_FEE`);
      if (ledger.open.has(key)) {
        ledgerStatus = 'POSTED';
        feeTotal += fee;
      } else if (status === FulfilmentStatus.COMPLETED) ledgerStatus = 'REVERSED';
      else ledgerStatus = 'PENDING';
    }

    installations.push({
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      customerName: `${sale.customer.firstName} ${sale.customer.lastName}`,
      fee,
      status,
      completedAt: sale.installationDate?.toISOString() ?? null,
      ledgerStatus,
    });
  }

  const scoped = await scopedLedgerFinance(storeId, workerId, WorkerResponsibility.INSTALLER);
  const earned = await openCommissionAmount(storeId, workerId, WorkerResponsibility.INSTALLER);
  return {
    scheduled,
    inProgress,
    completed,
    cancelled,
    feeTotal: earned || feeTotal,
    paid: scoped.paid,
    outstanding: scoped.outstanding,
    installations,
  };
}

async function buildSmmLikeModule(
  storeId: string,
  workerId: string,
  responsibility: typeof WorkerResponsibility.SMM | typeof WorkerResponsibility.OTHER,
): Promise<WorkerProfileSmmModule> {
  const monthStart = startOfUtcMonth();
  const [all, month, taggedRows] = await Promise.all([
    workerFinancialRepository.aggregateWorkerTotals({
      storeId,
      workerId,
      responsibility,
    }),
    workerFinancialRepository.aggregateWorkerTotals({
      storeId,
      workerId,
      dateFrom: monthStart,
      responsibility,
    }),
    prisma.workerFinancialTransaction.findMany({
      where: {
        storeId,
        workerId,
        responsibility,
        type: {
          in: [
            WorkerFinancialTransactionType.COMMISSION,
            WorkerFinancialTransactionType.BONUS,
            WorkerFinancialTransactionType.ADJUSTMENT,
          ],
        },
      },
      select: {
        id: true,
        amount: true,
        description: true,
        transactionDate: true,
      },
      orderBy: { transactionDate: 'desc' },
      take: 50,
    }),
  ]);

  const fees = taggedRows.map((row) => ({
    id: row.id,
    amount: fromDbMoney(row.amount),
    description: row.description,
    occurredAt: row.transactionDate.toISOString(),
  }));

  return {
    hasAssignedWork: false,
    hasAttributedFee: fees.length > 0,
    emptyWorkMessage: 'Hozircha tayinlangan ish yo‘q',
    emptyFeeMessage: 'Hozircha haq belgilanmagan',
    tasks: [],
    fees,
    monthEarned: computeWorkerEarnedTotal({
      totalBonuses: month.totalBonuses,
      totalCommissions: month.totalCommissions,
      totalAdvances: month.totalAdvances,
      totalDebt: month.totalDebt,
      totalPayments: month.totalPayments,
      totalAdjustments: month.totalAdjustments,
      reversalsByOriginalType: month.reversalsByOriginalType,
    }),
    paid: computeWorkerPaidTotal({
      totalBonuses: all.totalBonuses,
      totalCommissions: all.totalCommissions,
      totalAdvances: all.totalAdvances,
      totalDebt: all.totalDebt,
      totalPayments: all.totalPayments,
      totalAdjustments: all.totalAdjustments,
      reversalsByOriginalType: all.reversalsByOriginalType,
    }),
    outstanding: all.netFinancialPosition,
    bonuses: all.totalBonuses - (all.reversalsByOriginalType?.BONUS ?? 0),
    advances: all.totalAdvances - (all.reversalsByOriginalType?.ADVANCE ?? 0),
    debt: all.totalDebt - (all.reversalsByOriginalType?.DEBT ?? 0),
    payments: all.totalPayments - (all.reversalsByOriginalType?.PAYMENT ?? 0),
    adjustments: all.totalAdjustments - (all.reversalsByOriginalType?.ADJUSTMENT ?? 0),
  };
}

export async function getWorkerProfileModules(
  storeId: string,
  actor: { id: string; role: string },
  workerId: string,
): Promise<WorkerProfileModules> {
  if (actor.id !== workerId) {
    assertCanManageWorkers(actor.role);
  }

  const record = await workerRepository.findWorkerInStore(storeId, workerId);
  if (!record) throw ApiError.notFound('Worker not found');

  const responsibilities = record.responsibilities.map(
    (r) => r.responsibility as WorkerResponsibility,
  );
  const monthStart = startOfUtcMonth();

  const [ledgerSummary, monthSummary, attributed] = await Promise.all([
    workerFinancialRepository.aggregateWorkerTotals({ storeId, workerId }),
    workerFinancialRepository.aggregateWorkerTotals({
      storeId,
      workerId,
      dateFrom: monthStart,
    }),
    workerRepository.listWorkerAttributedFees(storeId, workerId),
  ]);

  const finance = financeFromSummary(ledgerSummary, monthSummary);
  const breakdown: WorkerProfileResponsibilityBreakdown[] = [];

  if (responsibilities.includes(WorkerResponsibility.SELLER)) {
    breakdown.push({
      responsibility: WorkerResponsibility.SELLER,
      label: 'Sotuvchilik',
      earned: attributed.sellerBonusTotal,
      count: attributed.items.filter(
        (i) => i.kind === 'SELLER_COMMISSION' || i.kind === 'SELLER_BONUS',
      ).length,
      detail: null,
    });
  }
  if (responsibilities.includes(WorkerResponsibility.ASSEMBLER)) {
    breakdown.push({
      responsibility: WorkerResponsibility.ASSEMBLER,
      label: 'Ustalik',
      earned: attributed.assemblerFeeTotal,
      count: attributed.items.filter((i) => i.kind === 'ASSEMBLER_FEE').length,
      detail: null,
    });
  }
  if (responsibilities.includes(WorkerResponsibility.DELIVERY)) {
    breakdown.push({
      responsibility: WorkerResponsibility.DELIVERY,
      label: 'Shopirlik',
      earned: attributed.deliveryFeeTotal + attributed.purchaseDriverFeeTotal,
      count: attributed.items.filter(
        (i) => i.kind === 'DELIVERY_FEE' || i.kind === 'PURCHASE_DRIVER_FEE',
      ).length,
      detail: null,
    });
  }
  if (responsibilities.includes(WorkerResponsibility.INSTALLER)) {
    breakdown.push({
      responsibility: WorkerResponsibility.INSTALLER,
      label: "O'rnatish",
      earned: attributed.installerFeeTotal,
      count: attributed.items.filter((i) => i.kind === 'INSTALLER_FEE').length,
      detail: null,
    });
  }
  if (responsibilities.includes(WorkerResponsibility.SMM)) {
    breakdown.push({
      responsibility: WorkerResponsibility.SMM,
      label: 'SMM',
      earned: 0,
      count: 0,
      detail: 'Hozircha haq belgilanmagan',
    });
  }
  if (responsibilities.includes(WorkerResponsibility.OTHER)) {
    breakdown.push({
      responsibility: WorkerResponsibility.OTHER,
      label: 'Boshqa',
      earned: 0,
      count: 0,
      detail: 'Hozircha haq belgilanmagan',
    });
  }

  const [seller, assembler, delivery, installer, smm, other] = await Promise.all([
    responsibilities.includes(WorkerResponsibility.SELLER)
      ? buildSellerModule(storeId, workerId)
      : Promise.resolve(null),
    responsibilities.includes(WorkerResponsibility.ASSEMBLER)
      ? buildAssemblerModule(storeId, workerId)
      : Promise.resolve(null),
    responsibilities.includes(WorkerResponsibility.DELIVERY)
      ? buildDeliveryModule(storeId, workerId)
      : Promise.resolve(null),
    responsibilities.includes(WorkerResponsibility.INSTALLER)
      ? buildInstallerModule(storeId, workerId)
      : Promise.resolve(null),
    responsibilities.includes(WorkerResponsibility.SMM)
      ? buildSmmLikeModule(storeId, workerId, WorkerResponsibility.SMM)
      : Promise.resolve(null),
    responsibilities.includes(WorkerResponsibility.OTHER)
      ? buildSmmLikeModule(storeId, workerId, WorkerResponsibility.OTHER)
      : Promise.resolve(null),
  ]);

  if (seller) {
    const row = breakdown.find((item) => item.responsibility === WorkerResponsibility.SELLER);
    if (row) {
      row.earned = seller.earnedTotal;
      row.count = seller.commissions.filter((line) => line.status === 'OPEN').length;
      row.detail = 'Sotuv komissiyasi (ledger)';
    }
  }
  if (smm) {
    const row = breakdown.find((item) => item.responsibility === WorkerResponsibility.SMM);
    if (row) {
      row.earned = smm.fees.reduce((sum, fee) => sum + fee.amount, 0);
      row.count = smm.fees.length;
      row.detail = smm.hasAttributedFee ? 'SMM haqlari (ledger)' : smm.emptyFeeMessage;
    }
  }
  if (other) {
    const row = breakdown.find((item) => item.responsibility === WorkerResponsibility.OTHER);
    if (row) {
      row.earned = other.fees.reduce((sum, fee) => sum + fee.amount, 0);
      row.count = other.fees.length;
      row.detail = other.hasAttributedFee ? 'Boshqa haqlar (ledger)' : other.emptyFeeMessage;
    }
  }

  return {
    worker: {
      id: record.id,
      fullName: record.fullName,
      username: record.username,
      phone: record.phone,
      role: record.role,
      isActive: record.isActive,
      responsibilities,
      createdAt: record.createdAt.toISOString(),
    },
    tabs: tabsFor(responsibilities),
    general: { finance, breakdown },
    seller,
    assembler,
    delivery,
    installer,
    smm,
    other,
    ledgerSummary,
  };
}

export async function getMyProfileModules(
  storeId: string,
  workerId: string,
): Promise<WorkerProfileModules> {
  return getWorkerProfileModules(storeId, { id: workerId, role: UserRole.EMPLOYEE }, workerId);
}

/** Admin P&L vs open ledger reconciliation for operational fees. */
export async function getStoreFeeReconciliation(
  storeId: string,
  actorRole: string,
): Promise<WorkerFeeReconciliation> {
  assertCanManageWorkers(actorRole);

  // Completed work stays a real business cost even when the document is later
  // cancelled, and the ledger keeps those fees — so the P&L side must count
  // them too, otherwise reconciliation reports a phantom difference.
  const [assemblyPnl, deliveryPnl, installerPnl, purchasePnl, ledger] = await Promise.all([
    prisma.sale.aggregate({
      where: { storeId, assemblyStatus: 'COMPLETED' },
      _sum: { installationCost: true },
    }),
    prisma.sale.aggregate({
      where: { storeId, deliveryStatus: FulfilmentStatus.COMPLETED },
      _sum: { deliveryCost: true },
    }),
    prisma.sale.aggregate({
      where: { storeId, installationStatus: FulfilmentStatus.COMPLETED },
      _sum: { installerFee: true },
    }),
    prisma.purchase.aggregate({
      where: { storeId, driverFee: { gt: 0 }, deliveredAt: { not: null } },
      _sum: { driverFee: true },
    }),
    prisma.workerFinancialTransaction.groupBy({
      by: ['responsibility'],
      where: {
        storeId,
        type: WorkerFinancialTransactionType.COMMISSION,
        isOpen: true,
        responsibility: {
          in: [
            WorkerResponsibility.ASSEMBLER,
            WorkerResponsibility.DELIVERY,
            WorkerResponsibility.INSTALLER,
          ],
        },
      },
      _sum: { amount: true },
    }),
  ]);

  const ledgerByResp = new Map(
    ledger.map((row) => [row.responsibility, fromDbMoney(row._sum.amount ?? 0n)]),
  );

  // Purchase driver fees also use DELIVERY responsibility — include PURCHASE refs separately.
  const purchaseLedger = await prisma.workerFinancialTransaction.aggregate({
    where: {
      storeId,
      type: WorkerFinancialTransactionType.COMMISSION,
      isOpen: true,
      referenceType: WorkerFinancialReferenceType.PURCHASE,
    },
    _sum: { amount: true },
  });

  const saleDeliveryLedger = await prisma.workerFinancialTransaction.aggregate({
    where: {
      storeId,
      type: WorkerFinancialTransactionType.COMMISSION,
      isOpen: true,
      responsibility: WorkerResponsibility.DELIVERY,
      referenceType: WorkerFinancialReferenceType.SALE,
    },
    _sum: { amount: true },
  });

  const rows = [
    {
      kind: 'ASSEMBLY' as const,
      label: 'Usta / terlash',
      pnlTotal: fromDbMoney(assemblyPnl._sum.installationCost ?? 0n),
      ledgerTotal: ledgerByResp.get(WorkerResponsibility.ASSEMBLER) ?? 0,
      difference: 0,
    },
    {
      kind: 'DELIVERY' as const,
      label: 'Sotuv yetkazib berish',
      pnlTotal: fromDbMoney(deliveryPnl._sum.deliveryCost ?? 0n),
      ledgerTotal: fromDbMoney(saleDeliveryLedger._sum.amount ?? 0n),
      difference: 0,
    },
    {
      kind: 'INSTALLER' as const,
      label: "O'rnatuvchi",
      pnlTotal: fromDbMoney(installerPnl._sum.installerFee ?? 0n),
      ledgerTotal: ledgerByResp.get(WorkerResponsibility.INSTALLER) ?? 0,
      difference: 0,
    },
    {
      kind: 'PURCHASE_DRIVER' as const,
      label: 'Kirim shopir',
      pnlTotal: fromDbMoney(purchasePnl._sum.driverFee ?? 0n),
      ledgerTotal: fromDbMoney(purchaseLedger._sum.amount ?? 0n),
      difference: 0,
    },
  ].map((row) => ({ ...row, difference: row.pnlTotal - row.ledgerTotal }));

  return {
    storeId,
    rows,
    hasDifferences: rows.some((r) => r.difference !== 0),
  };
}
