/**
 * Separate Usta / Installer / Shopir operational fees — PostgreSQL E2E.
 * Marker: WORKER_FEES_E2E_OK
 *
 * Covers: sale with all three workers, complete each once, duplicate complete,
 * cancel reversals, backfill idempotency, store isolation, attributed totals.
 */
import {
  AssemblyTaskStatus,
  FulfilmentStatus,
  PrismaClient,
  UserRole,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
  WorkerResponsibility,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

import * as workerOperationalFees from '../src/services/worker-operational-fees.service.js';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const prisma = new PrismaClient();
const MARKER = 'WORKER_FEES_E2E';

type Json = Record<string, unknown>;

async function request(
  method: string,
  path: string,
  options?: { cookie?: string; body?: unknown },
): Promise<{ status: number; body: Json; setCookie: string | null }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.cookie) headers.Cookie = options.cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return {
    status: res.status,
    body: (await res.json().catch(() => ({}))) as Json,
    setCookie: res.headers.get('set-cookie'),
  };
}

function extractCookie(setCookie: string | null, jar: string): string {
  if (!setCookie) return jar;
  const parts = setCookie.split(/,(?=\s*[^;]+=)/);
  const next = [...jar.split(';').map((s) => s.trim()).filter(Boolean)];
  for (const part of parts) {
    const pair = part.split(';')[0]?.trim();
    if (!pair) continue;
    const name = pair.split('=')[0];
    const idx = next.findIndex((c) => c.startsWith(`${name}=`));
    if (idx >= 0) next[idx] = pair;
    else next.push(pair);
  }
  return next.join('; ');
}

function dataOf(body: Json): Json {
  return (body.data as Json) ?? body;
}

async function countOpenCommissions(
  storeId: string,
  workerId: string,
  referenceType: WorkerFinancialReferenceType,
  referenceId: string,
): Promise<number> {
  const rows = await prisma.workerFinancialTransaction.findMany({
    where: {
      storeId,
      workerId,
      type: WorkerFinancialTransactionType.COMMISSION,
      referenceType,
      referenceId,
    },
    select: { id: true },
  });
  let open = 0;
  for (const row of rows) {
    const rev = await prisma.workerFinancialTransaction.findFirst({
      where: {
        storeId,
        type: WorkerFinancialTransactionType.REVERSAL,
        referenceType: WorkerFinancialReferenceType.REVERSAL,
        referenceId: row.id,
      },
    });
    if (!rev) open += 1;
  }
  return open;
}

async function cleanup(storeId: string) {
  const users = await prisma.user.findMany({
    where: { storeId, email: { contains: `${MARKER.toLowerCase()}@` } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  const products = await prisma.product.findMany({
    where: { storeId, description: MARKER },
    select: { id: true },
  });
  const productIds = products.map((p) => p.id);
  const sales = await prisma.sale.findMany({
    where: {
      storeId,
      OR: [
        { notes: { contains: MARKER } },
        { items: { some: { productId: { in: productIds } } } },
      ],
    },
    select: { id: true },
  });
  const saleIds = sales.map((s) => s.id);
  const suppliers = await prisma.supplier.findMany({
    where: { storeId, notes: { contains: MARKER } },
    select: { id: true },
  });
  const supplierIds = suppliers.map((s) => s.id);
  const purchases = await prisma.purchase.findMany({
    where: { storeId, supplierId: { in: supplierIds } },
    select: { id: true },
  });
  const purchaseIds = purchases.map((p) => p.id);

  const feeRefs = saleIds.flatMap((id) => [
    `${id}:ASSEMBLY_FEE`,
    `${id}:INSTALLER_FEE`,
    `${id}:DELIVERY_FEE`,
    `${id}:INSTALLATION_COST`,
    `${id}:DELIVERY_COST`,
    `${id}:ASSEMBLY:FEE`,
    `${id}:INSTALLATION:FEE`,
    `${id}:DELIVERY:FEE`,
  ]);
  const purchaseRefs = purchaseIds.map((id) => `${id}:DRIVER_FEE`);

  await prisma.workerFinancialTransaction.deleteMany({
    where: {
      storeId,
      OR: [
        { workerId: { in: userIds } },
        { description: { contains: MARKER } },
        { referenceId: { in: [...feeRefs, ...purchaseRefs] } },
      ],
    },
  });
  await prisma.assemblyTask.deleteMany({ where: { saleId: { in: saleIds } } });
  await prisma.payment.deleteMany({ where: { saleId: { in: saleIds } } });
  await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
  await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });
  await prisma.stockMovement.deleteMany({
    where: {
      storeId,
      OR: [
        { productId: { in: productIds } },
        { referenceId: { in: purchaseIds } },
      ],
    },
  });
  await prisma.supplierPayment.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
  await prisma.purchaseItem.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
  await prisma.purchase.deleteMany({ where: { id: { in: purchaseIds } } });
  await prisma.supplier.deleteMany({ where: { id: { in: supplierIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.customer.deleteMany({
    where: { storeId, notes: { contains: MARKER } },
  });
  await prisma.userResponsibility.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, isActive: true },
  });
  if (!admin) throw new Error('No admin');
  const store = await prisma.store.findUniqueOrThrow({ where: { id: admin.storeId } });
  await cleanup(store.id);

  const e2ePassword = process.env.SEED_ADMIN_PASSWORD ?? 'E2eWorkerFees123!';
  const originalHash = admin.passwordHash;
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(e2ePassword, 4) },
  });

  try {
    const login = await request('POST', '/api/auth/login', {
      body: {
        identifier: admin.username ?? admin.email,
        password: e2ePassword,
      },
    });
    if (login.status !== 200) {
      throw new Error(`login failed ${login.status} ${JSON.stringify(login.body)}`);
    }
    const cookie = extractCookie(login.setCookie, '');

    const hash = await bcrypt.hash('WorkerFees123!', 4);
    const usta = await prisma.user.create({
      data: {
        storeId: store.id,
        fullName: `${MARKER} Jasurbek`,
        email: `usta.${MARKER.toLowerCase()}@example.com`,
        username: `usta_${MARKER.toLowerCase()}`,
        passwordHash: hash,
        role: UserRole.EMPLOYEE,
        isActive: true,
        responsibilities: {
          create: [{ storeId: store.id, responsibility: WorkerResponsibility.ASSEMBLER }],
        },
      },
    });
    const installer = await prisma.user.create({
      data: {
        storeId: store.id,
        fullName: `${MARKER} Olim`,
        email: `installer.${MARKER.toLowerCase()}@example.com`,
        username: `installer_${MARKER.toLowerCase()}`,
        passwordHash: hash,
        role: UserRole.EMPLOYEE,
        isActive: true,
        responsibilities: {
          create: [{ storeId: store.id, responsibility: WorkerResponsibility.INSTALLER }],
        },
      },
    });
    const shopir = await prisma.user.create({
      data: {
        storeId: store.id,
        fullName: `${MARKER} Qamariddin`,
        email: `shopir.${MARKER.toLowerCase()}@example.com`,
        username: `shopir_${MARKER.toLowerCase()}`,
        passwordHash: hash,
        role: UserRole.EMPLOYEE,
        isActive: true,
        responsibilities: {
          create: [{ storeId: store.id, responsibility: WorkerResponsibility.DELIVERY }],
        },
      },
    });

    const customer = await prisma.customer.create({
      data: {
        storeId: store.id,
        firstName: 'E2E',
        lastName: MARKER,
        phone: `90${String(Date.now()).slice(-7)}`,
        notes: MARKER,
      },
    });

    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        name: `${MARKER} Xontaxta`,
        description: MARKER,
        sku: `SKU-${MARKER}-${Date.now()}`,
        costPrice: 7_000_000n,
        defaultSalePrice: 10_000_000n,
        trackStock: false,
        stockQty: 0,
        status: 'ACTIVE',
      },
    });

    const saleRes = await request('POST', '/api/sales', {
      cookie,
      body: {
        customerId: customer.id,
        sellerId: admin.id,
        assemblerId: usta.id,
        installationWorkerId: installer.id,
        deliveryPersonId: shopir.id,
        assemblerFee: 340_000,
        installerFee: 220_000,
        driverFee: 150_000,
        deliveryRequired: true,
        installationRequired: true,
        notes: MARKER,
        items: [
          {
            productId: product.id,
            quantity: 1,
            unitCostPrice: 7_000_000,
            unitSalePrice: 10_000_000,
          },
        ],
        paymentType: 'FULL_PAYMENT',
        depositAmount: 10_000_000,
        depositMethod: 'CASH',
      },
    });
    if (saleRes.status !== 201 && saleRes.status !== 200) {
      throw new Error(`sale create failed ${saleRes.status} ${JSON.stringify(saleRes.body)}`);
    }
    const sale = dataOf(saleRes.body).sale as Json;
    const saleId = String(sale.id);

    if (Number(sale.installerFee) !== 220_000) {
      throw new Error(`expected installerFee 220000 on create, got ${String(sale.installerFee)}`);
    }
    if (Number(sale.assemblerFee ?? sale.installationCost) !== 340_000) {
      throw new Error(`expected assemblerFee 340000 on create`);
    }

    const beforeUsta = await countOpenCommissions(
      store.id,
      usta.id,
      WorkerFinancialReferenceType.ASSEMBLY,
      `${saleId}:ASSEMBLY_FEE`,
    );
    const beforeInstaller = await countOpenCommissions(
      store.id,
      installer.id,
      WorkerFinancialReferenceType.ASSEMBLY,
      `${saleId}:INSTALLER_FEE`,
    );
    const beforeShopir = await countOpenCommissions(
      store.id,
      shopir.id,
      WorkerFinancialReferenceType.SALE,
      `${saleId}:DELIVERY_FEE`,
    );
    if (beforeUsta !== 0 || beforeInstaller !== 0 || beforeShopir !== 0) {
      throw new Error(
        `fees posted before completion usta=${beforeUsta} installer=${beforeInstaller} shopir=${beforeShopir}`,
      );
    }

    const tasks = await prisma.assemblyTask.findMany({ where: { saleId } });
    if (tasks.length === 0) throw new Error('assembly task missing');
    const taskId = tasks[0]!.id;

    for (let i = 0; i < 3; i += 1) {
      const complete = await request('PATCH', `/api/assembly-tasks/${taskId}`, {
        cookie,
        body: { status: AssemblyTaskStatus.COMPLETED },
      });
      if (complete.status !== 200) {
        throw new Error(
          `assembly complete #${i} failed ${complete.status} ${JSON.stringify(complete.body)}`,
        );
      }
    }

    const afterUsta = await countOpenCommissions(
      store.id,
      usta.id,
      WorkerFinancialReferenceType.ASSEMBLY,
      `${saleId}:ASSEMBLY_FEE`,
    );
    if (afterUsta !== 1) {
      throw new Error(`expected 1 usta commission after triple complete, got ${afterUsta}`);
    }
    // Installer must remain unpaid until installation COMPLETED
    if (
      (await countOpenCommissions(
        store.id,
        installer.id,
        WorkerFinancialReferenceType.ASSEMBLY,
        `${saleId}:INSTALLER_FEE`,
      )) !== 0
    ) {
      throw new Error('installer paid on assembly complete — not independent');
    }

    const saleAfterAssembly = await prisma.sale.findUniqueOrThrow({ where: { id: saleId } });
    if (saleAfterAssembly.installationStatus === FulfilmentStatus.COMPLETED) {
      throw new Error('installation auto-completed despite installerFee > 0');
    }

    for (let i = 0; i < 3; i += 1) {
      const inst = await request('PATCH', `/api/sales/${saleId}`, {
        cookie,
        body: { installationStatus: FulfilmentStatus.COMPLETED },
      });
      if (inst.status !== 200) {
        throw new Error(
          `installation complete #${i} failed ${inst.status} ${JSON.stringify(inst.body)}`,
        );
      }
    }
    const afterInstaller = await countOpenCommissions(
      store.id,
      installer.id,
      WorkerFinancialReferenceType.ASSEMBLY,
      `${saleId}:INSTALLER_FEE`,
    );
    if (afterInstaller !== 1) {
      throw new Error(`expected 1 installer commission, got ${afterInstaller}`);
    }

    for (let i = 0; i < 3; i += 1) {
      const del = await request('PATCH', `/api/sales/${saleId}`, {
        cookie,
        body: { deliveryStatus: FulfilmentStatus.COMPLETED },
      });
      if (del.status !== 200) {
        throw new Error(`delivery complete #${i} failed ${del.status} ${JSON.stringify(del.body)}`);
      }
    }
    const afterShopir = await countOpenCommissions(
      store.id,
      shopir.id,
      WorkerFinancialReferenceType.SALE,
      `${saleId}:DELIVERY_FEE`,
    );
    if (afterShopir !== 1) {
      throw new Error(`expected 1 delivery commission, got ${afterShopir}`);
    }

    // Profile attributed fees reconcile
    const ustaFeesRes = await request('GET', `/api/workers/${usta.id}/attributed-fees`, {
      cookie,
    });
    const ustaFees = dataOf(ustaFeesRes.body).fees as Json;
    if (Number(ustaFees.assemblerFeeTotal) !== 340_000) {
      throw new Error(`usta attributed mismatch ${String(ustaFees.assemblerFeeTotal)}`);
    }
    if (Number(ustaFees.installerFeeTotal) !== 0) {
      throw new Error('usta profile must not include installer fees');
    }

    const installerFeesRes = await request(
      'GET',
      `/api/workers/${installer.id}/attributed-fees`,
      { cookie },
    );
    const installerFees = dataOf(installerFeesRes.body).fees as Json;
    if (Number(installerFees.installerFeeTotal) !== 220_000) {
      throw new Error(`installer attributed mismatch ${String(installerFees.installerFeeTotal)}`);
    }
    if (Number(installerFees.assemblerFeeTotal) !== 0) {
      throw new Error('installer profile must not include usta fees');
    }

    const shopirFeesRes = await request('GET', `/api/workers/${shopir.id}/attributed-fees`, {
      cookie,
    });
    const shopirFees = dataOf(shopirFeesRes.body).fees as Json;
    if (Number(shopirFees.deliveryFeeTotal) !== 150_000) {
      throw new Error(`shopir attributed mismatch ${String(shopirFees.deliveryFeeTotal)}`);
    }

    // Backfill must skip already-posted fees (idempotent)
    const backfillSkipAssembly = await prisma.$transaction(async (tx) =>
      workerOperationalFees.postAssemblyFeeOnComplete({
        storeId: store.id,
        saleId,
        saleNumber: Number(sale.saleNumber),
        workerId: usta.id,
        assemblyFee: 340_000,
        actorId: admin.id,
        client: tx,
      }),
    );
    const backfillSkipInstaller = await prisma.$transaction(async (tx) =>
      workerOperationalFees.postInstallerFeeOnComplete({
        storeId: store.id,
        saleId,
        saleNumber: Number(sale.saleNumber),
        workerId: installer.id,
        installerFee: 220_000,
        actorId: admin.id,
        client: tx,
      }),
    );
    if (backfillSkipAssembly || backfillSkipInstaller) {
      throw new Error('backfill created duplicate on already-posted sale');
    }

    // Synthetic "old completed" sale without ledger rows → backfill once
    const oldSaleNumber = 9_000_000 + (Date.now() % 100_000);
    const oldSale = await prisma.sale.create({
      data: {
        storeId: store.id,
        saleNumber: oldSaleNumber,
        customerId: customer.id,
        sellerId: admin.id,
        createdById: admin.id,
        installerId: installer.id,
        deliveryPersonId: shopir.id,
        status: 'ACTIVE',
        paymentType: 'FULL_PAYMENT',
        paymentStatus: 'PAID',
        saleDate: new Date(),
        subtotal: 1_000_000n,
        discountAmount: 0n,
        totalSalePrice: 1_000_000n,
        totalCostPrice: 500_000n,
        depositAmount: 1_000_000n,
        paidAmount: 1_000_000n,
        remainingAmount: 0n,
        sellerBonus: 0n,
        installationCost: 50_000n,
        installerFee: 40_000n,
        deliveryCost: 30_000n,
        otherCosts: 0n,
        grossProfit: 500_000n,
        netProfit: 380_000n,
        installationStatus: FulfilmentStatus.COMPLETED,
        deliveryStatus: FulfilmentStatus.COMPLETED,
        installationDate: new Date(),
        deliveryDate: new Date(),
        notes: `${MARKER} backfill`,
        items: {
          create: [
            {
              storeId: store.id,
              productId: product.id,
              productName: product.name,
              quantity: 1,
              unitCostPrice: 500_000n,
              unitSalePrice: 1_000_000n,
              lineCostTotal: 500_000n,
              lineSaleTotal: 1_000_000n,
            },
          ],
        },
      },
    });
    await prisma.assemblyTask.create({
      data: {
        storeId: store.id,
        saleId: oldSale.id,
        assigneeId: usta.id,
        assignedById: admin.id,
        status: AssemblyTaskStatus.COMPLETED,
        assignedAt: new Date(),
        completedAt: new Date(),
        completedById: admin.id,
      },
    });

    const bfAssembly = await prisma.$transaction(async (tx) =>
      workerOperationalFees.postAssemblyFeeOnComplete({
        storeId: store.id,
        saleId: oldSale.id,
        saleNumber: oldSale.saleNumber,
        workerId: usta.id,
        assemblyFee: oldSale.installationCost,
        actorId: admin.id,
        client: tx,
      }),
    );
    const bfInstaller = await prisma.$transaction(async (tx) =>
      workerOperationalFees.postInstallerFeeOnComplete({
        storeId: store.id,
        saleId: oldSale.id,
        saleNumber: oldSale.saleNumber,
        workerId: installer.id,
        installerFee: oldSale.installerFee,
        actorId: admin.id,
        client: tx,
      }),
    );
    const bfDelivery = await prisma.$transaction(async (tx) =>
      workerOperationalFees.postDeliveryFeeOnComplete({
        storeId: store.id,
        saleId: oldSale.id,
        saleNumber: oldSale.saleNumber,
        workerId: shopir.id,
        deliveryCost: oldSale.deliveryCost,
        actorId: admin.id,
        client: tx,
      }),
    );
    if (!bfAssembly || !bfInstaller || !bfDelivery) {
      throw new Error(
        `backfill expected posts assembly=${bfAssembly} installer=${bfInstaller} delivery=${bfDelivery}`,
      );
    }
    const bfDup = await prisma.$transaction(async (tx) =>
      workerOperationalFees.postInstallerFeeOnComplete({
        storeId: store.id,
        saleId: oldSale.id,
        saleNumber: oldSale.saleNumber,
        workerId: installer.id,
        installerFee: oldSale.installerFee,
        actorId: admin.id,
        client: tx,
      }),
    );
    if (bfDup) throw new Error('backfill duplicate installer fee');

    // Store isolation: other store must not see these txs
    const otherStore = await prisma.store.create({
      data: {
        name: `${MARKER} Other`,
      },
    });
    try {
      const leak = await prisma.workerFinancialTransaction.count({
        where: {
          storeId: otherStore.id,
          OR: [
            { workerId: usta.id },
            { workerId: installer.id },
            { workerId: shopir.id },
          ],
        },
      });
      if (leak !== 0) throw new Error('cross-store fee leak');
    } finally {
      await prisma.store.delete({ where: { id: otherStore.id } });
    }

    // Cancel primary sale → reversals (originals retained)
    const cancel = await request('POST', `/api/sales/${saleId}/cancel`, {
      cookie,
      body: { reason: `${MARKER} cancel` },
    });
    if (cancel.status !== 200) {
      throw new Error(`cancel failed ${cancel.status} ${JSON.stringify(cancel.body)}`);
    }

    for (const [workerId, refType, refId] of [
      [usta.id, WorkerFinancialReferenceType.ASSEMBLY, `${saleId}:ASSEMBLY_FEE`],
      [installer.id, WorkerFinancialReferenceType.ASSEMBLY, `${saleId}:INSTALLER_FEE`],
      [shopir.id, WorkerFinancialReferenceType.SALE, `${saleId}:DELIVERY_FEE`],
    ] as const) {
      const open = await countOpenCommissions(store.id, workerId, refType, refId);
      if (open !== 0) throw new Error(`expected reversed open=0 for ${refId}, got ${open}`);
      const original = await prisma.workerFinancialTransaction.findFirst({
        where: { storeId: store.id, workerId, referenceId: refId, type: 'COMMISSION' },
      });
      if (!original) throw new Error(`original commission missing for ${refId}`);
      const rev = await prisma.workerFinancialTransaction.findFirst({
        where: {
          storeId: store.id,
          type: 'REVERSAL',
          referenceType: 'REVERSAL',
          referenceId: original.id,
        },
      });
      if (!rev) throw new Error(`reversal missing for ${refId}`);
    }

    console.log('WORKER_FEES_E2E_OK');
  } finally {
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: originalHash },
    });
    await cleanup(store.id);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
