/**
 * Idempotent backfill of operational worker fees for completed work that
 * never landed on WorkerFinancialTransaction.
 *
 * Never mutates existing ledger rows. Duplicate refs are skipped by
 * post*Fee helpers (open + legacy refs + unique index).
 */
import { AssemblyTaskStatus, FulfilmentStatus, PurchaseStatus } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import * as workerOperationalFees from './worker-operational-fees.service.js';

export type OperationalFeeBackfillKind =
  | 'ASSEMBLY_FEE'
  | 'INSTALLER_FEE'
  | 'DELIVERY_FEE'
  | 'PURCHASE_DRIVER_FEE';

export interface OperationalFeeBackfillCandidate {
  kind: OperationalFeeBackfillKind;
  storeId: string;
  documentId: string;
  documentNumber: number;
  workerId: string;
  amount: bigint | number;
  productSummary: string;
  occurredAt: Date;
  actorId: string;
}

async function hasAnyRef(
  storeId: string,
  referenceType: 'ASSEMBLY' | 'SALE' | 'PURCHASE',
  referenceIds: string[],
): Promise<boolean> {
  const row = await prisma.workerFinancialTransaction.findFirst({
    where: {
      storeId,
      type: 'COMMISSION',
      referenceType,
      referenceId: { in: referenceIds },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function collectMissingOperationalFees(): Promise<OperationalFeeBackfillCandidate[]> {
  const [assembly, installer, delivery, purchase] = await Promise.all([
    collectAssemblyCandidates(),
    collectInstallerCandidates(),
    collectDeliveryCandidates(),
    collectPurchaseCandidates(),
  ]);
  return [...assembly, ...installer, ...delivery, ...purchase];
}

async function collectAssemblyCandidates(): Promise<OperationalFeeBackfillCandidate[]> {
  const tasks = await prisma.assemblyTask.findMany({
    where: {
      status: AssemblyTaskStatus.COMPLETED,
      sale: { installationCost: { gt: 0 } },
    },
    select: {
      assigneeId: true,
      completedAt: true,
      completedById: true,
      assignedById: true,
      sale: {
        select: {
          id: true,
          storeId: true,
          saleNumber: true,
          installationCost: true,
          createdById: true,
          items: { select: { productName: true }, take: 3 },
        },
      },
    },
  });

  const out: OperationalFeeBackfillCandidate[] = [];
  for (const task of tasks) {
    const sale = task.sale;
    const refs = [
      workerOperationalFees.ASSEMBLY_FEE_REF(sale.id),
      workerOperationalFees.LEGACY_INSTALLATION_COST_REF(sale.id),
      workerOperationalFees.LEGACY_ASSEMBLY_COLON_FEE_REF(sale.id),
    ];
    if (await hasAnyRef(sale.storeId, 'ASSEMBLY', refs)) continue;
    out.push({
      kind: 'ASSEMBLY_FEE',
      storeId: sale.storeId,
      documentId: sale.id,
      documentNumber: sale.saleNumber,
      workerId: task.assigneeId,
      amount: sale.installationCost,
      productSummary: sale.items.map((i) => i.productName).join(', '),
      occurredAt: task.completedAt ?? new Date(),
      actorId: task.completedById ?? task.assignedById ?? sale.createdById ?? task.assigneeId,
    });
  }
  return out;
}

async function collectInstallerCandidates(): Promise<OperationalFeeBackfillCandidate[]> {
  const sales = await prisma.sale.findMany({
    where: {
      installationStatus: FulfilmentStatus.COMPLETED,
      installerFee: { gt: 0 },
      installerId: { not: null },
    },
    select: {
      id: true,
      storeId: true,
      saleNumber: true,
      installerFee: true,
      installerId: true,
      installationDate: true,
      saleDate: true,
      createdById: true,
      items: { select: { productName: true }, take: 3 },
    },
  });

  const out: OperationalFeeBackfillCandidate[] = [];
  for (const sale of sales) {
    if (!sale.installerId) continue;
    const refs = [
      workerOperationalFees.INSTALLER_FEE_REF(sale.id),
      workerOperationalFees.LEGACY_INSTALLATION_COLON_FEE_REF(sale.id),
    ];
    if (await hasAnyRef(sale.storeId, 'ASSEMBLY', refs)) continue;
    out.push({
      kind: 'INSTALLER_FEE',
      storeId: sale.storeId,
      documentId: sale.id,
      documentNumber: sale.saleNumber,
      workerId: sale.installerId,
      amount: sale.installerFee,
      productSummary: sale.items.map((i) => i.productName).join(', '),
      occurredAt: sale.installationDate ?? sale.saleDate,
      actorId: sale.createdById ?? sale.installerId,
    });
  }
  return out;
}

async function collectDeliveryCandidates(): Promise<OperationalFeeBackfillCandidate[]> {
  const sales = await prisma.sale.findMany({
    where: {
      deliveryStatus: FulfilmentStatus.COMPLETED,
      deliveryCost: { gt: 0 },
      deliveryPersonId: { not: null },
    },
    select: {
      id: true,
      storeId: true,
      saleNumber: true,
      deliveryCost: true,
      deliveryPersonId: true,
      deliveryDate: true,
      saleDate: true,
      createdById: true,
      items: { select: { productName: true }, take: 3 },
    },
  });

  const out: OperationalFeeBackfillCandidate[] = [];
  for (const sale of sales) {
    if (!sale.deliveryPersonId) continue;
    const refs = [
      workerOperationalFees.DELIVERY_FEE_REF(sale.id),
      workerOperationalFees.LEGACY_DELIVERY_COST_REF(sale.id),
      workerOperationalFees.LEGACY_DELIVERY_COLON_FEE_REF(sale.id),
    ];
    if (await hasAnyRef(sale.storeId, 'SALE', refs)) continue;
    out.push({
      kind: 'DELIVERY_FEE',
      storeId: sale.storeId,
      documentId: sale.id,
      documentNumber: sale.saleNumber,
      workerId: sale.deliveryPersonId,
      amount: sale.deliveryCost,
      productSummary: sale.items.map((i) => i.productName).join(', '),
      occurredAt: sale.deliveryDate ?? sale.saleDate,
      actorId: sale.createdById ?? sale.deliveryPersonId,
    });
  }
  return out;
}

async function collectPurchaseCandidates(): Promise<OperationalFeeBackfillCandidate[]> {
  const purchases = await prisma.purchase.findMany({
    where: {
      deliveredAt: { not: null },
      driverId: { not: null },
      driverFee: { gt: 0 },
    },
    select: {
      id: true,
      storeId: true,
      purchaseNumber: true,
      driverFee: true,
      driverId: true,
      deliveredAt: true,
      purchaseDate: true,
      createdById: true,
      status: true,
      supplier: { select: { name: true } },
    },
  });

  const out: OperationalFeeBackfillCandidate[] = [];
  for (const purchase of purchases) {
    if (!purchase.driverId) continue;
    if (purchase.status === PurchaseStatus.CANCELLED && !purchase.deliveredAt) continue;
    const refs = [workerOperationalFees.PURCHASE_DRIVER_FEE_REF(purchase.id)];
    if (await hasAnyRef(purchase.storeId, 'PURCHASE', refs)) continue;
    out.push({
      kind: 'PURCHASE_DRIVER_FEE',
      storeId: purchase.storeId,
      documentId: purchase.id,
      documentNumber: purchase.purchaseNumber,
      workerId: purchase.driverId,
      amount: purchase.driverFee,
      productSummary: purchase.supplier.name,
      occurredAt: purchase.deliveredAt ?? purchase.purchaseDate,
      actorId: purchase.createdById ?? purchase.driverId,
    });
  }
  return out;
}

export async function applyOperationalFeeBackfillCandidate(
  c: OperationalFeeBackfillCandidate,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    if (c.kind === 'ASSEMBLY_FEE') {
      return workerOperationalFees.postAssemblyFeeOnComplete({
        storeId: c.storeId,
        saleId: c.documentId,
        saleNumber: c.documentNumber,
        workerId: c.workerId,
        assemblyFee: c.amount,
        productSummary: c.productSummary,
        actorId: c.actorId,
        occurredAt: c.occurredAt,
        client: tx,
      });
    }
    if (c.kind === 'INSTALLER_FEE') {
      return workerOperationalFees.postInstallerFeeOnComplete({
        storeId: c.storeId,
        saleId: c.documentId,
        saleNumber: c.documentNumber,
        workerId: c.workerId,
        installerFee: c.amount,
        productSummary: c.productSummary,
        actorId: c.actorId,
        occurredAt: c.occurredAt,
        client: tx,
      });
    }
    if (c.kind === 'PURCHASE_DRIVER_FEE') {
      return workerOperationalFees.postPurchaseDriverFee({
        storeId: c.storeId,
        purchaseId: c.documentId,
        purchaseNumber: c.documentNumber,
        workerId: c.workerId,
        driverFee: typeof c.amount === 'bigint' ? Number(c.amount) : c.amount,
        supplierName: c.productSummary,
        actorId: c.actorId,
        occurredAt: c.occurredAt,
        client: tx,
      });
    }
    return workerOperationalFees.postDeliveryFeeOnComplete({
      storeId: c.storeId,
      saleId: c.documentId,
      saleNumber: c.documentNumber,
      workerId: c.workerId,
      deliveryCost: c.amount,
      productSummary: c.productSummary,
      actorId: c.actorId,
      occurredAt: c.occurredAt,
      client: tx,
    });
  });
}

export async function runOperationalFeeBackfill(options: {
  apply: boolean;
}): Promise<{
  mode: 'APPLY' | 'DRY-RUN';
  candidates: number;
  backfilled: number;
  skipped: number;
  byKind: Record<OperationalFeeBackfillKind, number>;
}> {
  const candidates = await collectMissingOperationalFees();
  const byKind: Record<OperationalFeeBackfillKind, number> = {
    ASSEMBLY_FEE: 0,
    INSTALLER_FEE: 0,
    DELIVERY_FEE: 0,
    PURCHASE_DRIVER_FEE: 0,
  };
  for (const c of candidates) byKind[c.kind] += 1;

  let backfilled = 0;
  let skipped = 0;
  if (!options.apply) {
    return {
      mode: 'DRY-RUN',
      candidates: candidates.length,
      backfilled: candidates.length,
      skipped: 0,
      byKind,
    };
  }

  for (const c of candidates) {
    const posted = await applyOperationalFeeBackfillCandidate(c);
    if (posted) backfilled += 1;
    else skipped += 1;
  }

  return {
    mode: 'APPLY',
    candidates: candidates.length,
    backfilled,
    skipped,
    byKind,
  };
}
