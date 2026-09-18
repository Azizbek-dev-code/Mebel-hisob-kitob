/**
 * Seller commission posting — authoritative earned path.
 *
 * Estimate: computeSellerCommissionLines (pure).
 * Earned: COMMISSION + COMPENSATION ref `${saleId}:PERCENT_OF_*` / FIXED_PER_SALE / MANUAL:SELLER.
 * Settle uses the same refs, so auto-post and settle cannot double-pay.
 * Cancel reverses via reverseSaleOperationalFees (COMPENSATION startsWith saleId).
 * Seller compensation stays reversible on cancel — unlike usta / shopir fees it
 * pays for the sale result, not for a physical service that was performed.
 */
import {
  DateRangePreset,
  deriveSalePaymentStatus,
  SaleStatus,
  SaleWorkerPayRole,
  SellerCommissionStatus,
  UserRole,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
  WorkerResponsibility,
  computeSellerCommissionLines,
  computeWorkerEarnedTotal,
  computeWorkerPaidTotal,
  formatMoneyNumber,
  isSellerCompensationRef,
  sellerCompensationRef,
  type SellerCommissionLine,
  type SellerCommissionRuleInput,
  type SellerCommissionStatus as SellerCommissionStatusValue,
  type SellerReport,
  type SellerSaleOpsItem,
} from '@furniture-erp/shared';

import { resolveDashboardRange } from '../lib/date-range.js';

import { fromDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';
import * as workerCompensationRepository from '../repositories/worker-compensation.repository.js';
import type { WorkerFinancialTxClient } from '../repositories/worker-financial.repository.js';
import * as workerFinancialRepository from '../repositories/worker-financial.repository.js';
import { ApiError } from '../utils/api-error.js';

function db(client?: WorkerFinancialTxClient) {
  return client ?? prisma;
}

function rulesToInput(
  rules: Awaited<ReturnType<typeof workerCompensationRepository.listRulesForWorker>>,
): SellerCommissionRuleInput[] {
  return rules.map((rule) => ({
    id: rule.id,
    type: rule.type,
    value: rule.value,
    isActive: rule.isActive,
    effectiveFrom: new Date(rule.effectiveFrom),
    effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : null,
  }));
}

function describeLine(
  saleNumber: number,
  productSummary: string,
  line: SellerCommissionLine,
): string {
  const product = productSummary.trim() || 'Mebel';
  const rate =
    line.rateLabel && line.ruleType !== 'MANUAL_SELLER' && line.ruleType !== 'FIXED_PER_SALE'
      ? ` · Stavka ${line.rateLabel}`
      : line.ruleType === 'FIXED_PER_SALE'
        ? ` · Qat'iy ${formatMoneyNumber(line.amount)}`
        : '';
  const base =
    line.ruleType === 'PERCENT_OF_GROSS_PROFIT'
      ? ` · Yalpi foyda ${formatMoneyNumber(line.baseAmount)}`
      : line.ruleType === 'PERCENT_OF_SALE'
        ? ` · Sotuv ${formatMoneyNumber(line.baseAmount)}`
        : '';
  return `Komissiya · Sotuv #${saleNumber} · ${product}${base}${rate}`;
}

async function reverseOpenCommission(
  storeId: string,
  original: {
    id: string;
    workerId: string;
    amount: bigint | number;
    type: string;
    description: string | null;
    responsibility?: string | null;
    /** Keep reversal in the same month as the original commission (saleDate-based). */
    transactionDate?: Date;
  },
  actorId: string,
  reason: string,
  client?: WorkerFinancialTxClient,
  /** Fallback when original.transactionDate is missing (e.g. sale.saleDate). */
  businessDate?: Date,
): Promise<void> {
  const already = await workerFinancialRepository.findReversalOf(storeId, original.id, client);
  if (already) return;

  const amount =
    typeof original.amount === 'bigint' ? fromDbMoney(original.amount) : original.amount;

  await workerFinancialRepository.createTransaction(
    {
      storeId,
      workerId: original.workerId,
      type: WorkerFinancialTransactionType.REVERSAL,
      amount,
      // Historical sales: never stamp wall-clock month — net the same period as the earn.
      transactionDate: original.transactionDate ?? businessDate ?? new Date(),
      description: reason,
      referenceType: WorkerFinancialReferenceType.REVERSAL,
      referenceId: original.id,
      reversesType: WorkerFinancialTransactionType.COMMISSION,
      responsibility: WorkerResponsibility.SELLER,
      createdById: actorId,
    },
    client,
  );
  await workerFinancialRepository.closeOpenCommission(storeId, original.id, client);
}

export async function findOpenSellerCommissionsForSale(
  storeId: string,
  saleId: string,
  client?: WorkerFinancialTxClient,
) {
  const rows = await db(client).workerFinancialTransaction.findMany({
    where: {
      storeId,
      type: WorkerFinancialTransactionType.COMMISSION,
      isOpen: true,
      referenceType: WorkerFinancialReferenceType.COMPENSATION,
      referenceId: { startsWith: `${saleId}:` },
    },
  });
  return rows.filter((row) => isSellerCompensationRef(saleId, row.referenceId));
}

async function loadSaleForSync(
  storeId: string,
  saleId: string,
  client?: WorkerFinancialTxClient,
) {
  return db(client).sale.findFirst({
    where: { id: saleId, storeId },
    select: {
      id: true,
      saleNumber: true,
      saleDate: true,
      status: true,
      sellerId: true,
      totalSalePrice: true,
      grossProfit: true,
      netProfit: true,
      items: { select: { productName: true }, take: 3 },
      workerCompensations: {
        where: { role: SaleWorkerPayRole.SELLER },
        select: { workerId: true, amount: true, role: true },
      },
    },
  });
}

export async function computeLinesForSale(options: {
  storeId: string;
  saleId: string;
  client?: WorkerFinancialTxClient;
}): Promise<{
  sale: NonNullable<Awaited<ReturnType<typeof loadSaleForSync>>>;
  workerId: string | null;
  lines: SellerCommissionLine[];
  productSummary: string;
} | null> {
  const sale = await loadSaleForSync(options.storeId, options.saleId, options.client);
  if (!sale) return null;

  const productSummary = sale.items.map((item) => item.productName).join(', ');
  if (sale.status === SaleStatus.CANCELLED || sale.status === SaleStatus.DRAFT) {
    return { sale, workerId: sale.sellerId, lines: [], productSummary };
  }

  const manual = sale.workerCompensations[0];
  const workerId = manual?.workerId ?? sale.sellerId;
  if (!workerId) {
    return { sale, workerId: null, lines: [], productSummary };
  }

  const rules = await workerCompensationRepository.listRulesForWorker(
    options.storeId,
    workerId,
    undefined,
    options.client,
  );

  const lines = computeSellerCommissionLines({
    rules: rulesToInput(rules),
    saleDate: sale.saleDate,
    totalSalePrice: fromDbMoney(sale.totalSalePrice),
    grossProfit: fromDbMoney(sale.grossProfit),
    manualAmount: manual ? fromDbMoney(manual.amount) : null,
  });

  return { sale, workerId, lines, productSummary };
}

/**
 * Post or refresh seller COMMISSION for a sale. Idempotent per COMPENSATION ref.
 * Different amount / worker / rule type → reverse old, post new (audit trail).
 */
export async function syncSellerCommissionForSale(options: {
  storeId: string;
  saleId: string;
  actorId: string;
  client?: WorkerFinancialTxClient;
}): Promise<{ posted: number; reversed: number }> {
  const computed = await computeLinesForSale(options);
  if (!computed) return { posted: 0, reversed: 0 };

  const { sale, workerId, lines, productSummary } = computed;
  const existing = await findOpenSellerCommissionsForSale(
    options.storeId,
    options.saleId,
    options.client,
  );

  const desired = new Map(
    workerId
      ? lines.map((line) => [
          sellerCompensationRef(sale.id, line.referenceSuffix),
          { line, workerId },
        ])
      : [],
  );

  let reversed = 0;
  let posted = 0;

  for (const row of existing) {
    const want = row.referenceId ? desired.get(row.referenceId) : undefined;
    const sameAmountAndWorker =
      want &&
      want.workerId === row.workerId &&
      fromDbMoney(row.amount) === want.line.amount;
    // Historical saleDate edits must re-stamp the ledger month even when amount is unchanged.
    const sameBusinessDate =
      row.transactionDate instanceof Date &&
      row.transactionDate.getTime() === sale.saleDate.getTime();
    if (sameAmountAndWorker && sameBusinessDate) {
      desired.delete(row.referenceId!);
      continue;
    }
    await reverseOpenCommission(
      options.storeId,
      row,
      options.actorId,
      `Reversal · Sotuv #${sale.saleNumber} komissiyasi qayta hisoblandi`,
      options.client,
      // Prefer original commission date so August→September edit nets August correctly.
      row.transactionDate instanceof Date ? row.transactionDate : sale.saleDate,
    );
    reversed += 1;
  }

  for (const [referenceId, { line, workerId: lineWorkerId }] of desired) {
    if (line.amount <= 0) continue;
    try {
      await workerFinancialRepository.createTransaction(
        {
          storeId: options.storeId,
          workerId: lineWorkerId,
          type: WorkerFinancialTransactionType.COMMISSION,
          amount: line.amount,
          transactionDate: sale.saleDate,
          description: describeLine(sale.saleNumber, productSummary, line),
          referenceType: WorkerFinancialReferenceType.COMPENSATION,
          referenceId,
          responsibility: WorkerResponsibility.SELLER,
          createdById: options.actorId,
        },
        options.client,
      );
      posted += 1;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') continue;
      throw error;
    }
  }

  return { posted, reversed };
}

export function deriveSellerCommissionStatus(input: {
  saleStatus: string;
  estimated: number;
  earned: number;
  reversed: boolean;
  workerPaid: number;
  workerEarned: number;
}): SellerCommissionStatusValue {
  if (input.saleStatus === SaleStatus.CANCELLED) return SellerCommissionStatus.CANCELLED;
  if (input.reversed && input.earned <= 0) return SellerCommissionStatus.REVERSED;
  if (input.earned > 0) {
    if (input.workerEarned <= 0) return SellerCommissionStatus.EARNED;
    if (input.workerPaid <= 0) return SellerCommissionStatus.EARNED;
    if (input.workerPaid >= input.workerEarned) return SellerCommissionStatus.PAID;
    return SellerCommissionStatus.PARTIALLY_PAID;
  }
  if (input.estimated > 0) return SellerCommissionStatus.ESTIMATED;
  return SellerCommissionStatus.NONE;
}

export interface SellerSaleDecorateRow {
  id: string;
  saleNumber: number;
  saleDate: Date;
  status: string;
  totalSalePrice: bigint | number;
  totalCostPrice: bigint | number;
  grossProfit: bigint | number;
  netProfit: bigint | number;
  paidAmount: bigint | number;
  remainingAmount: bigint | number;
  customerName: string;
  productSummary: string;
}

export async function decorateSellerSales(
  storeId: string,
  workerId: string,
  rows: SellerSaleDecorateRow[],
): Promise<SellerSaleOpsItem[]> {
  if (rows.length === 0) return [];

  const [rules, commissions, totals] = await Promise.all([
    workerCompensationRepository.listRulesForWorker(storeId, workerId),
    prisma.workerFinancialTransaction.findMany({
      where: {
        storeId,
        workerId,
        type: WorkerFinancialTransactionType.COMMISSION,
        referenceType: WorkerFinancialReferenceType.COMPENSATION,
        OR: rows.map((row) => ({ referenceId: { startsWith: `${row.id}:` } })),
      },
      select: { id: true, amount: true, referenceId: true, isOpen: true },
    }),
    workerFinancialRepository.aggregateWorkerTotals({
      storeId,
      workerId,
      responsibility: WorkerResponsibility.SELLER,
    }),
  ]);

  const commissionIds = commissions.map((row) => row.id);
  const reversals =
    commissionIds.length === 0
      ? []
      : await prisma.workerFinancialTransaction.findMany({
          where: {
            storeId,
            type: WorkerFinancialTransactionType.REVERSAL,
            referenceType: WorkerFinancialReferenceType.REVERSAL,
            referenceId: { in: commissionIds },
          },
          select: { referenceId: true },
        });
  const reversedIds = new Set(reversals.map((row) => row.referenceId).filter(Boolean));

  const bySale = new Map<string, { earned: number; reversed: boolean }>();
  for (const row of commissions) {
    if (!row.referenceId || !isSellerCompensationRef(row.referenceId.split(':')[0] ?? '', row.referenceId)) {
      continue;
    }
    const saleId = row.referenceId.split(':')[0]!;
    const current = bySale.get(saleId) ?? { earned: 0, reversed: false };
    const isReversed = reversedIds.has(row.id) || row.isOpen === false;
    if (isReversed) current.reversed = true;
    else current.earned += fromDbMoney(row.amount);
    bySale.set(saleId, current);
  }

  const ruleInputs = rulesToInput(rules);
  const workerEarned =
    totals.totalCommissions +
    totals.totalBonuses +
    totals.totalAdjustments -
    (totals.reversalsByOriginalType?.COMMISSION ?? 0) -
    (totals.reversalsByOriginalType?.BONUS ?? 0) -
    (totals.reversalsByOriginalType?.ADJUSTMENT ?? 0);
  const workerPaid = totals.totalPayments - (totals.reversalsByOriginalType?.PAYMENT ?? 0);

  return rows.map((row) => {
    const money = (value: bigint | number) =>
      typeof value === 'bigint' ? fromDbMoney(value) : value;
    const estimate = computeSellerCommissionLines({
      rules: ruleInputs,
      saleDate: row.saleDate,
      totalSalePrice: money(row.totalSalePrice),
      grossProfit: money(row.grossProfit),
    });
    const estimatedCommission = estimate.reduce((sum, line) => sum + line.amount, 0);
    const first = estimate[0];
    const posted = bySale.get(row.id) ?? { earned: 0, reversed: false };

    return {
      id: row.id,
      saleNumber: row.saleNumber,
      saleDate: row.saleDate.toISOString(),
      customerName: row.customerName,
      productSummary: row.productSummary,
      totalSalePrice: money(row.totalSalePrice),
      totalCostPrice: money(row.totalCostPrice),
      grossProfit: money(row.grossProfit),
      netProfit: money(row.netProfit),
      paidAmount: money(row.paidAmount),
      remainingAmount: money(row.remainingAmount),
      paymentStatus: deriveSalePaymentStatus(money(row.totalSalePrice), money(row.paidAmount)),
      status: row.status as SellerSaleOpsItem['status'],
      ruleType: first?.ruleType === 'MANUAL_SELLER' ? 'MANUAL_SELLER' : (first?.ruleType ?? null),
      rateLabel: first?.rateLabel ?? null,
      estimatedCommission,
      earnedCommission: posted.earned,
      commissionStatus: deriveSellerCommissionStatus({
        saleStatus: row.status,
        estimated: estimatedCommission,
        earned: posted.earned,
        reversed: posted.reversed,
        workerPaid,
        workerEarned,
      }),
    };
  });
}

function ymdFromInstant(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export async function getSellerReport(options: {
  storeId: string;
  workerId: string;
  actor: { id: string; role: string };
  preset?: (typeof DateRangePreset)[keyof typeof DateRangePreset];
  from?: string;
  to?: string;
}): Promise<SellerReport> {
  if (options.actor.id !== options.workerId) {
    if (options.actor.role !== UserRole.ADMIN && options.actor.role !== UserRole.PLATFORM_ADMIN) {
      throw ApiError.forbidden('Only store administrators can view another worker seller report');
    }
  }

  const store = await workerFinancialRepository.findStoreTimezone(options.storeId);
  const timeZone = store?.timezone || 'Asia/Tashkent';
  const preset = options.preset ?? DateRangePreset.THIS_MONTH;
  const range = resolveDashboardRange(preset, { from: options.from, to: options.to }, timeZone);

  const sales = await prisma.sale.findMany({
    where: {
      storeId: options.storeId,
      sellerId: options.workerId,
      saleDate: { gte: range.from, lt: range.to },
    },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      items: { select: { productName: true }, take: 3 },
    },
    orderBy: { saleDate: 'asc' },
    take: 500,
  });

  const decorated = await decorateSellerSales(
    options.storeId,
    options.workerId,
    sales.map((row) => ({
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

  const [periodTotals, worker] = await Promise.all([
    workerFinancialRepository.aggregateWorkerTotals({
      storeId: options.storeId,
      workerId: options.workerId,
      dateFrom: range.from,
      dateTo: range.to,
      responsibility: WorkerResponsibility.SELLER,
    }),
    prisma.user.findFirst({
      where: { id: options.workerId, storeId: options.storeId },
      select: { id: true, fullName: true },
    }),
  ]);

  const earned = computeWorkerEarnedTotal({
    totalBonuses: periodTotals.totalBonuses,
    totalCommissions: periodTotals.totalCommissions,
    totalAdvances: periodTotals.totalAdvances,
    totalDebt: periodTotals.totalDebt,
    totalPayments: periodTotals.totalPayments,
    totalAdjustments: periodTotals.totalAdjustments,
    reversalsByOriginalType: periodTotals.reversalsByOriginalType,
  });
  const paid = computeWorkerPaidTotal({
    totalBonuses: periodTotals.totalBonuses,
    totalCommissions: periodTotals.totalCommissions,
    totalAdvances: periodTotals.totalAdvances,
    totalDebt: periodTotals.totalDebt,
    totalPayments: periodTotals.totalPayments,
    totalAdjustments: periodTotals.totalAdjustments,
    reversalsByOriginalType: periodTotals.reversalsByOriginalType,
  });

  const activeSales = decorated.filter((row) => row.status !== SaleStatus.CANCELLED);
  const payments = await prisma.workerFinancialTransaction.findMany({
    where: {
      storeId: options.storeId,
      workerId: options.workerId,
      responsibility: WorkerResponsibility.SELLER,
      type: {
        in: [WorkerFinancialTransactionType.PAYMENT, WorkerFinancialTransactionType.REVERSAL],
      },
      transactionDate: { gte: range.from, lt: range.to },
    },
    orderBy: { transactionDate: 'asc' },
  });

  return {
    worker: {
      id: worker?.id ?? options.workerId,
      fullName: worker?.fullName ?? '—',
    },
    period: {
      from: ymdFromInstant(range.from, timeZone),
      to: ymdFromInstant(new Date(range.to.getTime() - 1), timeZone),
      preset,
    },
    summary: {
      salesCount: activeSales.length,
      salesAmount: activeSales.reduce((sum, row) => sum + row.totalSalePrice, 0),
      grossProfit: activeSales.reduce((sum, row) => sum + row.grossProfit, 0),
      netProfit: activeSales.reduce((sum, row) => sum + row.netProfit, 0),
      estimatedCommission: activeSales.reduce((sum, row) => sum + row.estimatedCommission, 0),
      earned,
      bonus: periodTotals.totalBonuses - (periodTotals.reversalsByOriginalType?.BONUS ?? 0),
      paid,
      outstanding: earned - paid,
    },
    sales: decorated,
    payments: payments
      .filter(
        (row) =>
          row.type === WorkerFinancialTransactionType.PAYMENT ||
          row.reversesType === WorkerFinancialTransactionType.PAYMENT,
      )
      .map((row) => ({
        id: row.id,
        amount: fromDbMoney(row.amount),
        transactionDate: row.transactionDate.toISOString(),
        description: row.description,
        type: row.type === WorkerFinancialTransactionType.PAYMENT ? 'PAYMENT' : 'REVERSAL',
      })),
  };
}
