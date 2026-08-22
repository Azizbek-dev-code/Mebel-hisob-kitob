/**
 * Phase 8 Step 4B integrity snapshot + temp rule cleanup helper.
 * Marker: PHASE8_STEP4B_TEMP
 */
/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MARKER = 'PHASE8_STEP4B_TEMP';
const mode = process.argv[2] ?? 'before';

async function snapshot() {
  const [sales, users, expenses, financeTx, compensationRules] = await Promise.all([
    prisma.sale.count(),
    prisma.user.count(),
    prisma.expense.count(),
    prisma.workerFinancialTransaction.count(),
    prisma.workerCompensationRule.count(),
  ]);

  // August 2026 analytics — same window used by the verified dashboard.
  const from = new Date('2026-08-01T00:00:00.000Z');
  const to = new Date('2026-09-01T00:00:00.000Z');

  const salesAgg = await prisma.sale.aggregate({
    where: { saleDate: { gte: from, lt: to }, status: { not: 'CANCELLED' } },
    _sum: { totalSalePrice: true, totalCostPrice: true, grossProfit: true },
  });
  const expenseAgg = await prisma.expense.aggregate({
    where: { expenseDate: { gte: from, lt: to } },
    _sum: { amount: true },
  });

  const revenue = Number(salesAgg._sum.totalSalePrice ?? 0n);
  const cogs = Number(salesAgg._sum.totalCostPrice ?? 0n);
  const gross = Number(salesAgg._sum.grossProfit ?? 0n);
  const operating = Number(expenseAgg._sum.amount ?? 0n);
  const net = gross - operating;

  return {
    sales,
    users,
    expenses,
    financeTx,
    compensationRules,
    august: { revenue, cogs, gross, operating, net },
  };
}

async function cleanupTemp() {
  // Soft-deactivate only — no hard DELETE (backend has none by design).
  const result = await prisma.workerCompensationRule.updateMany({
    where: { notes: { contains: MARKER } },
    data: { isActive: false },
  });
  return result.count;
}

async function main() {
  if (mode === 'cleanup') {
    const n = await cleanupTemp();
    console.log(JSON.stringify({ cleaned: n }));
    return;
  }

  const data = await snapshot();
  console.log(JSON.stringify({ mode, ...data }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
