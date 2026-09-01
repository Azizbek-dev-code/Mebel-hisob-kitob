/**
 * Idempotent backfill for operational worker fees posted before
 * ASSEMBLY_FEE / INSTALLER_FEE / DELIVERY_FEE separation.
 *
 * Usage:
 *   npx tsx scripts/backfill-worker-operational-fees.ts --dry-run
 *   npx tsx scripts/backfill-worker-operational-fees.ts --apply
 *
 * Never creates duplicates (checks current + legacy refs). Never modifies
 * existing transactions — only inserts missing COMMISSION rows.
 */
import {
  AssemblyTaskStatus,
  FulfilmentStatus,
  PrismaClient,
  SaleStatus,
} from '@prisma/client';

import * as workerOperationalFees from '../src/services/worker-operational-fees.service.js';

const prisma = new PrismaClient();

type Kind = 'ASSEMBLY_FEE' | 'INSTALLER_FEE' | 'DELIVERY_FEE';

interface Candidate {
  kind: Kind;
  storeId: string;
  saleId: string;
  saleNumber: number;
  workerId: string;
  amount: bigint;
  productSummary: string;
  occurredAt: Date;
  actorId: string;
}

function parseArgs(argv: string[]) {
  const apply = argv.includes('--apply');
  const dryRun = argv.includes('--dry-run') || !apply;
  if (apply && argv.includes('--dry-run')) {
    throw new Error('Use either --dry-run or --apply, not both');
  }
  return { apply, dryRun };
}

async function hasAnyRef(
  storeId: string,
  referenceType: 'ASSEMBLY' | 'SALE',
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

async function collectAssemblyCandidates(): Promise<Candidate[]> {
  const tasks = await prisma.assemblyTask.findMany({
    where: {
      status: AssemblyTaskStatus.COMPLETED,
      sale: { status: { not: SaleStatus.CANCELLED }, installationCost: { gt: 0 } },
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

  const out: Candidate[] = [];
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
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      workerId: task.assigneeId,
      amount: sale.installationCost,
      productSummary: sale.items.map((i) => i.productName).join(', '),
      occurredAt: task.completedAt ?? new Date(),
      actorId: task.completedById ?? task.assignedById ?? sale.createdById,
    });
  }
  return out;
}

async function collectInstallerCandidates(): Promise<Candidate[]> {
  const sales = await prisma.sale.findMany({
    where: {
      status: { not: SaleStatus.CANCELLED },
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

  const out: Candidate[] = [];
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
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      workerId: sale.installerId,
      amount: sale.installerFee,
      productSummary: sale.items.map((i) => i.productName).join(', '),
      occurredAt: sale.installationDate ?? sale.saleDate,
      actorId: sale.createdById,
    });
  }
  return out;
}

async function collectDeliveryCandidates(): Promise<Candidate[]> {
  const sales = await prisma.sale.findMany({
    where: {
      status: { not: SaleStatus.CANCELLED },
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

  const out: Candidate[] = [];
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
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      workerId: sale.deliveryPersonId,
      amount: sale.deliveryCost,
      productSummary: sale.items.map((i) => i.productName).join(', '),
      occurredAt: sale.deliveryDate ?? sale.saleDate,
      actorId: sale.createdById,
    });
  }
  return out;
}

async function applyCandidate(c: Candidate): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    if (c.kind === 'ASSEMBLY_FEE') {
      return workerOperationalFees.postAssemblyFeeOnComplete({
        storeId: c.storeId,
        saleId: c.saleId,
        saleNumber: c.saleNumber,
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
        saleId: c.saleId,
        saleNumber: c.saleNumber,
        workerId: c.workerId,
        installerFee: c.amount,
        productSummary: c.productSummary,
        actorId: c.actorId,
        occurredAt: c.occurredAt,
        client: tx,
      });
    }
    return workerOperationalFees.postDeliveryFeeOnComplete({
      storeId: c.storeId,
      saleId: c.saleId,
      saleNumber: c.saleNumber,
      workerId: c.workerId,
      deliveryCost: c.amount,
      productSummary: c.productSummary,
      actorId: c.actorId,
      occurredAt: c.occurredAt,
      client: tx,
    });
  });
}

async function main() {
  const { apply, dryRun } = parseArgs(process.argv.slice(2));
  const mode = apply ? 'APPLY' : 'DRY-RUN';
  console.log(`[backfill-worker-operational-fees] mode=${mode}`);

  const [assembly, installer, delivery] = await Promise.all([
    collectAssemblyCandidates(),
    collectInstallerCandidates(),
    collectDeliveryCandidates(),
  ]);
  const candidates = [...assembly, ...installer, ...delivery];

  let backfilled = 0;
  let skipped = 0;

  for (const c of candidates) {
    const label = `${c.kind} sale#${c.saleNumber} worker=${c.workerId} amount=${c.amount.toString()}`;
    if (dryRun) {
      console.log(`  would backfill ${label}`);
      backfilled += 1;
      continue;
    }
    const posted = await applyCandidate(c);
    if (posted) {
      console.log(`  backfilled ${label}`);
      backfilled += 1;
    } else {
      console.log(`  skipped ${label}`);
      skipped += 1;
    }
  }

  // Already-posted completed work is "skipped" relative to needing a backfill.
  const assemblyDone = await prisma.assemblyTask.count({
    where: {
      status: AssemblyTaskStatus.COMPLETED,
      sale: { status: { not: SaleStatus.CANCELLED }, installationCost: { gt: 0 } },
    },
  });
  const installerDone = await prisma.sale.count({
    where: {
      status: { not: SaleStatus.CANCELLED },
      installationStatus: FulfilmentStatus.COMPLETED,
      installerFee: { gt: 0 },
      installerId: { not: null },
    },
  });
  const deliveryDone = await prisma.sale.count({
    where: {
      status: { not: SaleStatus.CANCELLED },
      deliveryStatus: FulfilmentStatus.COMPLETED,
      deliveryCost: { gt: 0 },
      deliveryPersonId: { not: null },
    },
  });

  const alreadyCovered =
    assemblyDone + installerDone + deliveryDone - candidates.length;
  skipped += Math.max(0, alreadyCovered);

  console.log(
    JSON.stringify(
      {
        mode,
        candidates: candidates.length,
        backfilled,
        skipped,
        byKind: {
          ASSEMBLY_FEE: assembly.length,
          INSTALLER_FEE: installer.length,
          DELIVERY_FEE: delivery.length,
        },
      },
      null,
      2,
    ),
  );
  console.log('BACKFILL_WORKER_OPERATIONAL_FEES_OK');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
