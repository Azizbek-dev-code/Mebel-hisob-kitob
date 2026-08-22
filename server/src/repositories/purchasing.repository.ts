import {
  PurchasePaymentStatus,
  PurchaseStatus,
  SupplierStatus,
  buildPaginationMeta,
  normalisePagination,
  normalizeUzPhone,
  phoneLookupVariants,
  type PaymentMethod,
  type PurchaseDetail,
  type PurchaseLineItem,
  type PurchaseListItem,
  type PurchaseListQuery,
  type PurchaseListResponse,
  type PurchasePaymentItem,
  type PurchaseStockMovementItem,
  type ReportsSupplierPayables,
  type SupplierCatalogueSummary,
  type SupplierDetail,
  type SupplierFinancialSummary,
  type SupplierListItem,
  type SupplierListQuery,
  type SupplierListResponse,
  type SupplierPayableRow,
  type SupplierPayablesSummary,
  type SupplierPaymentHistoryItem,
  type SupplierPurchaseHistoryItem,
} from '@furniture-erp/shared';
import type { Prisma, Supplier } from '@prisma/client';

import { fromDbMoney, fromDbMoneySum, toDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';

export type PurchasingTxClient = Prisma.TransactionClient;

type MoneyAgg = {
  totalPurchases: bigint;
  totalPaid: bigint;
  outstandingDebt: bigint;
  openPurchaseCount: number;
  lastPurchaseAt: Date | null;
  revenuePurchaseCount: number;
  cancelledPurchaseCount: number;
};

function emptyAgg(): MoneyAgg {
  return {
    totalPurchases: 0n,
    totalPaid: 0n,
    outstandingDebt: 0n,
    openPurchaseCount: 0,
    lastPurchaseAt: null,
    revenuePurchaseCount: 0,
    cancelledPurchaseCount: 0,
  };
}

function toListItem(supplier: Supplier, agg: MoneyAgg): SupplierListItem {
  return {
    id: supplier.id,
    name: supplier.name,
    phone: supplier.phone,
    notes: supplier.notes,
    status: supplier.status,
    totalPurchases: fromDbMoney(agg.totalPurchases),
    totalPaid: fromDbMoney(agg.totalPaid),
    outstandingDebt: fromDbMoney(agg.outstandingDebt),
    openPurchaseCount: agg.openPurchaseCount,
    lastPurchaseAt: agg.lastPurchaseAt?.toISOString() ?? null,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}

async function aggregateFinancialsBySupplier(
  storeId: string,
  supplierIds: string[],
): Promise<Map<string, MoneyAgg>> {
  const map = new Map<string, MoneyAgg>();
  for (const id of supplierIds) map.set(id, emptyAgg());
  if (supplierIds.length === 0) return map;

  const purchases = await prisma.purchase.findMany({
    where: {
      storeId,
      supplierId: { in: supplierIds },
    },
    select: {
      supplierId: true,
      totalCost: true,
      paidAmount: true,
      remainingAmount: true,
      purchaseDate: true,
      status: true,
    },
  });

  for (const purchase of purchases) {
    const agg = map.get(purchase.supplierId) ?? emptyAgg();
    if (purchase.status === PurchaseStatus.CANCELLED) {
      agg.cancelledPurchaseCount += 1;
      map.set(purchase.supplierId, agg);
      continue;
    }

    agg.revenuePurchaseCount += 1;
    agg.totalPurchases += purchase.totalCost;
    agg.totalPaid += purchase.paidAmount;
    if (purchase.remainingAmount > 0n) {
      agg.outstandingDebt += purchase.remainingAmount;
      agg.openPurchaseCount += 1;
    }
    if (!agg.lastPurchaseAt || purchase.purchaseDate > agg.lastPurchaseAt) {
      agg.lastPurchaseAt = purchase.purchaseDate;
    }
    map.set(purchase.supplierId, agg);
  }

  return map;
}

export async function summarizeSuppliers(storeId: string): Promise<SupplierCatalogueSummary> {
  const [counts, debtAgg, suppliersInDebt] = await Promise.all([
    prisma.supplier.groupBy({
      by: ['status'],
      where: { storeId },
      _count: { _all: true },
    }),
    prisma.purchase.aggregate({
      where: {
        storeId,
        status: PurchaseStatus.ACTIVE,
        remainingAmount: { gt: 0n },
      },
      _sum: { remainingAmount: true },
    }),
    prisma.purchase.groupBy({
      by: ['supplierId'],
      where: {
        storeId,
        status: PurchaseStatus.ACTIVE,
        remainingAmount: { gt: 0n },
      },
    }),
  ]);

  let activeCount = 0;
  let archivedCount = 0;
  for (const row of counts) {
    if (row.status === SupplierStatus.ACTIVE) activeCount = row._count._all;
    if (row.status === SupplierStatus.ARCHIVED) archivedCount = row._count._all;
  }

  return {
    totalSuppliers: activeCount + archivedCount,
    activeCount,
    archivedCount,
    suppliersInDebt: suppliersInDebt.length,
    totalOutstanding: fromDbMoneySum(debtAgg._sum.remainingAmount),
  };
}

export async function listSuppliers(
  storeId: string,
  query: SupplierListQuery = {},
): Promise<SupplierListResponse> {
  const { page, pageSize } = normalisePagination(query.page, query.pageSize);
  const status = query.status ?? SupplierStatus.ACTIVE;
  const search = query.search?.trim();

  const where: Prisma.SupplierWhereInput = {
    storeId,
    ...(status === 'ALL' ? {} : { status: status as SupplierStatus }),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { phone: { contains: normalizeUzPhone(search) } },
            ...phoneLookupVariants(search).map((v) => ({ phone: { contains: v } })),
            { notes: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  const aggs = await aggregateFinancialsBySupplier(
    storeId,
    suppliers.map((s) => s.id),
  );

  let items = suppliers.map((s) => toListItem(s, aggs.get(s.id) ?? emptyAgg()));

  const debtFilter = query.debtFilter ?? 'ALL';
  if (debtFilter === 'CLEAR') {
    items = items.filter((i) => i.outstandingDebt === 0);
  } else if (debtFilter === 'IN_DEBT') {
    items = items.filter((i) => i.outstandingDebt > 0);
  }

  const total = items.length;
  const slice = items.slice((page - 1) * pageSize, page * pageSize);
  const summary = await summarizeSuppliers(storeId);

  return {
    summary,
    items: slice,
    meta: buildPaginationMeta(page, pageSize, total),
  };
}

export async function findSupplierInStore(
  storeId: string,
  supplierId: string,
  client: PurchasingTxClient | typeof prisma = prisma,
): Promise<Supplier | null> {
  return client.supplier.findFirst({ where: { storeId, id: supplierId } });
}

export async function createSupplier(
  storeId: string,
  input: { name: string; phone: string | null; notes: string | null },
): Promise<SupplierListItem> {
  const supplier = await prisma.supplier.create({
    data: {
      storeId,
      name: input.name,
      phone: input.phone,
      notes: input.notes,
      status: SupplierStatus.ACTIVE,
    },
  });
  return toListItem(supplier, emptyAgg());
}

export async function updateSupplier(
  storeId: string,
  supplierId: string,
  input: { name?: string; phone?: string | null; notes?: string | null },
): Promise<SupplierListItem | null> {
  const existing = await findSupplierInStore(storeId, supplierId);
  if (!existing) return null;

  const supplier = await prisma.supplier.update({
    where: { id: existing.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  const aggs = await aggregateFinancialsBySupplier(storeId, [supplier.id]);
  return toListItem(supplier, aggs.get(supplier.id) ?? emptyAgg());
}

export async function setSupplierStatus(
  storeId: string,
  supplierId: string,
  status: SupplierStatus,
): Promise<SupplierListItem | null> {
  const existing = await findSupplierInStore(storeId, supplierId);
  if (!existing) return null;

  const supplier = await prisma.supplier.update({
    where: { id: existing.id },
    data: { status },
  });

  const aggs = await aggregateFinancialsBySupplier(storeId, [supplier.id]);
  return toListItem(supplier, aggs.get(supplier.id) ?? emptyAgg());
}

function toFinancialSummary(agg: MoneyAgg): SupplierFinancialSummary {
  return {
    totalPurchases: fromDbMoney(agg.totalPurchases),
    totalPaid: fromDbMoney(agg.totalPaid),
    outstandingDebt: fromDbMoney(agg.outstandingDebt),
    openPurchaseCount: agg.openPurchaseCount,
    revenuePurchaseCount: agg.revenuePurchaseCount,
    cancelledPurchaseCount: agg.cancelledPurchaseCount,
  };
}

export async function getSupplierDetail(
  storeId: string,
  supplierId: string,
): Promise<SupplierDetail | null> {
  const supplier = await findSupplierInStore(storeId, supplierId);
  if (!supplier) return null;

  const aggs = await aggregateFinancialsBySupplier(storeId, [supplierId]);
  const agg = aggs.get(supplierId) ?? emptyAgg();

  const [purchases, payments] = await Promise.all([
    prisma.purchase.findMany({
      where: { storeId, supplierId },
      orderBy: [{ purchaseDate: 'desc' }, { purchaseNumber: 'desc' }],
      select: {
        id: true,
        purchaseNumber: true,
        purchaseDate: true,
        totalCost: true,
        paidAmount: true,
        remainingAmount: true,
        paymentStatus: true,
        status: true,
      },
    }),
    prisma.supplierPayment.findMany({
      where: { storeId, supplierId },
      orderBy: { paidAt: 'desc' },
      include: {
        createdBy: { select: { fullName: true } },
        purchase: { select: { purchaseNumber: true } },
      },
    }),
  ]);

  const purchaseHistory: SupplierPurchaseHistoryItem[] = purchases.map((p) => ({
    purchaseId: p.id,
    purchaseNumber: p.purchaseNumber,
    purchaseDate: p.purchaseDate.toISOString(),
    totalCost: fromDbMoney(p.totalCost),
    paidAmount: fromDbMoney(p.paidAmount),
    remainingAmount: fromDbMoney(p.remainingAmount),
    paymentStatus: p.paymentStatus,
    status: p.status,
  }));

  const paymentHistory: SupplierPaymentHistoryItem[] = payments.map((p) => ({
    paymentId: p.id,
    purchaseId: p.purchaseId,
    purchaseNumber: p.purchase.purchaseNumber,
    amount: fromDbMoney(p.amount),
    method: p.method,
    paidAt: p.paidAt.toISOString(),
    note: p.note,
    recordedByName: p.createdBy?.fullName ?? null,
  }));

  return {
    ...toListItem(supplier, agg),
    financial: toFinancialSummary(agg),
    purchases: purchaseHistory,
    payments: paymentHistory,
  };
}

function toPurchaseListItem(
  row: {
    id: string;
    purchaseNumber: number;
    purchaseDate: Date;
    supplierId: string;
    totalCost: bigint;
    paidAmount: bigint;
    remainingAmount: bigint;
    paymentStatus: PurchasePaymentStatus;
    status: PurchaseStatus;
    createdAt: Date;
    supplier: { name: string };
    _count: { items: number };
  },
): PurchaseListItem {
  return {
    id: row.id,
    purchaseNumber: row.purchaseNumber,
    purchaseDate: row.purchaseDate.toISOString(),
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    totalCost: fromDbMoney(row.totalCost),
    paidAmount: fromDbMoney(row.paidAmount),
    remainingAmount: fromDbMoney(row.remainingAmount),
    paymentStatus: row.paymentStatus,
    status: row.status,
    itemCount: row._count.items,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listPurchases(
  storeId: string,
  query: PurchaseListQuery = {},
): Promise<PurchaseListResponse> {
  const { page, pageSize } = normalisePagination(query.page, query.pageSize);
  const search = query.search?.trim();
  const paymentFilter = query.paymentFilter ?? 'ALL';

  const where: Prisma.PurchaseWhereInput = {
    storeId,
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
  };

  if (paymentFilter === 'CANCELLED') {
    where.status = PurchaseStatus.CANCELLED;
  } else if (paymentFilter === 'UNPAID') {
    where.status = PurchaseStatus.ACTIVE;
    where.paymentStatus = PurchasePaymentStatus.UNPAID;
  } else if (paymentFilter === 'PARTIALLY_PAID') {
    where.status = PurchaseStatus.ACTIVE;
    where.paymentStatus = PurchasePaymentStatus.PARTIALLY_PAID;
  } else if (paymentFilter === 'PAID') {
    where.status = PurchaseStatus.ACTIVE;
    where.paymentStatus = PurchasePaymentStatus.PAID;
  }

  if (search) {
    const asNumber = Number.parseInt(search, 10);
    where.OR = [
      ...(Number.isFinite(asNumber) ? [{ purchaseNumber: asNumber }] : []),
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
      { notes: { contains: search, mode: 'insensitive' } },
      { items: { some: { productName: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ purchaseDate: 'desc' }, { purchaseNumber: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(toPurchaseListItem),
    meta: buildPaginationMeta(page, pageSize, total),
  };
}

export async function getPurchaseDetail(
  storeId: string,
  purchaseId: string,
): Promise<PurchaseDetail | null> {
  const purchase = await prisma.purchase.findFirst({
    where: { storeId, id: purchaseId },
    include: {
      supplier: { select: { name: true } },
      items: { orderBy: { createdAt: 'asc' } },
      payments: {
        orderBy: { paidAt: 'asc' },
        include: { createdBy: { select: { fullName: true } } },
      },
      _count: { select: { items: true } },
    },
  });
  if (!purchase) return null;

  const movements = await prisma.stockMovement.findMany({
    where: {
      storeId,
      referenceType: 'PURCHASE',
      referenceId: purchase.id,
    },
    include: {
      product: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const items: PurchaseLineItem[] = purchase.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitCost: fromDbMoney(item.unitCost),
    lineTotal: fromDbMoney(item.lineTotal),
  }));

  const payments: PurchasePaymentItem[] = purchase.payments.map((p) => ({
    paymentId: p.id,
    amount: fromDbMoney(p.amount),
    method: p.method,
    paidAt: p.paidAt.toISOString(),
    note: p.note,
    recordedByName: p.createdBy?.fullName ?? null,
  }));

  const stockMovements: PurchaseStockMovementItem[] = movements.map((m) => ({
    movementId: m.id,
    productId: m.productId,
    productName: m.product.name,
    quantity: m.quantity,
    quantityBefore: m.quantityBefore,
    quantityAfter: m.quantityAfter,
    movementType: m.movementType,
    createdAt: m.createdAt.toISOString(),
  }));

  return {
    ...toPurchaseListItem(purchase),
    notes: purchase.notes,
    items,
    payments,
    stockMovements,
    cancelledAt: purchase.cancelledAt?.toISOString() ?? null,
    cancellationReason: purchase.cancellationReason,
  };
}

export async function nextPurchaseNumber(
  tx: PurchasingTxClient,
  storeId: string,
): Promise<number> {
  const latest = await tx.purchase.findFirst({
    where: { storeId },
    orderBy: { purchaseNumber: 'desc' },
    select: { purchaseNumber: true },
  });
  return (latest?.purchaseNumber ?? 0) + 1;
}

export async function createPurchaseInTx(
  tx: PurchasingTxClient,
  input: {
    storeId: string;
    supplierId: string;
    purchaseNumber: number;
    purchaseDate: Date;
    totalCost: number;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: PurchasePaymentStatus;
    notes: string | null;
    createdById: string | null;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitCost: number;
      lineTotal: number;
    }>;
  },
): Promise<{ id: string }> {
  const purchase = await tx.purchase.create({
    data: {
      storeId: input.storeId,
      supplierId: input.supplierId,
      purchaseNumber: input.purchaseNumber,
      purchaseDate: input.purchaseDate,
      totalCost: toDbMoney(input.totalCost),
      paidAmount: toDbMoney(input.paidAmount),
      remainingAmount: toDbMoney(input.remainingAmount),
      paymentStatus: input.paymentStatus,
      status: PurchaseStatus.ACTIVE,
      notes: input.notes,
      createdById: input.createdById,
      items: {
        create: input.items.map((item) => ({
          storeId: input.storeId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitCost: toDbMoney(item.unitCost),
          lineTotal: toDbMoney(item.lineTotal),
        })),
      },
    },
    select: { id: true },
  });
  return purchase;
}

export async function addPaymentInTx(
  tx: PurchasingTxClient,
  input: {
    storeId: string;
    purchaseId: string;
    supplierId: string;
    amount: number;
    method: PaymentMethod;
    paidAt: Date;
    note: string | null;
    createdById: string | null;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: PurchasePaymentStatus;
  },
): Promise<{ paymentId: string }> {
  const payment = await tx.supplierPayment.create({
    data: {
      storeId: input.storeId,
      purchaseId: input.purchaseId,
      supplierId: input.supplierId,
      amount: toDbMoney(input.amount),
      method: input.method,
      paidAt: input.paidAt,
      note: input.note,
      createdById: input.createdById,
    },
    select: { id: true },
  });

  await tx.purchase.update({
    where: { id: input.purchaseId },
    data: {
      paidAmount: toDbMoney(input.paidAmount),
      remainingAmount: toDbMoney(input.remainingAmount),
      paymentStatus: input.paymentStatus,
    },
  });

  return { paymentId: payment.id };
}

export async function cancelPurchaseInTx(
  tx: PurchasingTxClient,
  input: {
    purchaseId: string;
    cancelledById: string;
    cancellationReason: string;
    cancelledAt: Date;
  },
): Promise<void> {
  await tx.purchase.update({
    where: { id: input.purchaseId },
    data: {
      status: PurchaseStatus.CANCELLED,
      remainingAmount: 0n,
      cancelledAt: input.cancelledAt,
      cancelledById: input.cancelledById,
      cancellationReason: input.cancellationReason,
    },
  });
}

export async function findPurchaseForUpdate(
  tx: PurchasingTxClient,
  storeId: string,
  purchaseId: string,
) {
  return tx.purchase.findFirst({
    where: { storeId, id: purchaseId },
    include: {
      items: true,
      payments: {
        include: { createdBy: { select: { fullName: true } } },
      },
    },
  });
}

export async function summarizePayables(storeId: string): Promise<SupplierPayablesSummary> {
  const [purchaseAgg, paidAgg, debtAgg, openCount, suppliersInDebt] = await Promise.all([
    prisma.purchase.aggregate({
      where: { storeId, status: PurchaseStatus.ACTIVE },
      _sum: { totalCost: true },
    }),
    prisma.purchase.aggregate({
      where: { storeId, status: PurchaseStatus.ACTIVE },
      _sum: { paidAmount: true },
    }),
    prisma.purchase.aggregate({
      where: {
        storeId,
        status: PurchaseStatus.ACTIVE,
        remainingAmount: { gt: 0n },
      },
      _sum: { remainingAmount: true },
    }),
    prisma.purchase.count({
      where: {
        storeId,
        status: PurchaseStatus.ACTIVE,
        remainingAmount: { gt: 0n },
      },
    }),
    prisma.purchase.groupBy({
      by: ['supplierId'],
      where: {
        storeId,
        status: PurchaseStatus.ACTIVE,
        remainingAmount: { gt: 0n },
      },
    }),
  ]);

  return {
    totalPurchases: fromDbMoneySum(purchaseAgg._sum.totalCost),
    totalPaid: fromDbMoneySum(paidAgg._sum.paidAmount),
    totalOutstanding: fromDbMoneySum(debtAgg._sum.remainingAmount),
    suppliersInDebt: suppliersInDebt.length,
    openPurchaseCount: openCount,
  };
}

export async function listPayableSuppliers(storeId: string): Promise<SupplierPayableRow[]> {
  const purchases = await prisma.purchase.findMany({
    where: {
      storeId,
      status: PurchaseStatus.ACTIVE,
      remainingAmount: { gt: 0n },
    },
    select: {
      supplierId: true,
      totalCost: true,
      paidAmount: true,
      remainingAmount: true,
      supplier: { select: { name: true } },
    },
  });

  const bySupplier = new Map<
    string,
    {
      supplierName: string;
      totalPurchases: bigint;
      totalPaid: bigint;
      outstandingDebt: bigint;
      openPurchaseCount: number;
    }
  >();

  for (const row of purchases) {
    const existing = bySupplier.get(row.supplierId) ?? {
      supplierName: row.supplier.name,
      totalPurchases: 0n,
      totalPaid: 0n,
      outstandingDebt: 0n,
      openPurchaseCount: 0,
    };
    existing.totalPurchases += row.totalCost;
    existing.totalPaid += row.paidAmount;
    existing.outstandingDebt += row.remainingAmount;
    existing.openPurchaseCount += 1;
    bySupplier.set(row.supplierId, existing);
  }

  return [...bySupplier.entries()]
    .map(([supplierId, row]) => ({
      supplierId,
      supplierName: row.supplierName,
      totalPurchases: fromDbMoney(row.totalPurchases),
      totalPaid: fromDbMoney(row.totalPaid),
      outstandingDebt: fromDbMoney(row.outstandingDebt),
      openPurchaseCount: row.openPurchaseCount,
    }))
    .sort((a, b) => b.outstandingDebt - a.outstandingDebt);
}

export async function getReportsSupplierPayablesData(
  storeId: string,
): Promise<Omit<ReportsSupplierPayables, 'generatedAt'>> {
  const [summary, items] = await Promise.all([
    summarizePayables(storeId),
    listPayableSuppliers(storeId),
  ]);
  return { summary, items };
}

export async function sumSupplierPaymentsInPeriod(
  storeId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const agg = await prisma.supplierPayment.aggregate({
    where: {
      storeId,
      paidAt: { gte: from, lt: to },
    },
    _sum: { amount: true },
  });
  return fromDbMoneySum(agg._sum.amount);
}
