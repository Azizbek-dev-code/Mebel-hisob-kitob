/**
 * Acceptance-style unit coverage for responsibility tabs + multi-fee isolation.
 * Full HTTP E2E remains in scripts/*-e2e.ts when the API is running.
 */
import { UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, workerRepoMock, financialRepoMock, assertCanManageWorkersMock } = vi.hoisted(
  () => ({
    prismaMock: {
      store: { findFirst: vi.fn() },
      sale: { count: vi.fn(), aggregate: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
      assemblyTask: { findMany: vi.fn(), groupBy: vi.fn() },
      purchase: { findMany: vi.fn(), aggregate: vi.fn() },
      workerFinancialTransaction: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        aggregate: vi.fn(),
        groupBy: vi.fn(),
      },
    },
    workerRepoMock: {
      findWorkerInStore: vi.fn(),
      listWorkerAttributedFees: vi.fn(),
    },
    financialRepoMock: {
      aggregateWorkerTotals: vi.fn(),
      findOpenCommissionByRef: vi.fn(),
      findReversalOf: vi.fn(),
    },
    assertCanManageWorkersMock: vi.fn(),
  }),
);

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../repositories/worker.repository.js', () => workerRepoMock);
vi.mock('../repositories/worker-financial.repository.js', () => financialRepoMock);
vi.mock('../repositories/worker-compensation.repository.js', () => ({
  listRulesForWorker: vi.fn(async () => []),
}));
vi.mock('./seller-commission.service.js', () => ({
  decorateSellerSales: vi.fn(async () => []),
  syncSellerCommissionForSale: vi.fn(async () => ({ posted: 0, reversed: 0 })),
}));
vi.mock('./worker.service.js', () => ({
  assertCanManageWorkers: assertCanManageWorkersMock,
}));

const { getWorkerProfileModules, getStoreFeeReconciliation } = await import(
  './worker-profile-modules.service.js'
);

function emptyFinanceSummary(overrides: Record<string, number> = {}) {
  return {
    workerId: 'w1',
    worker: { id: 'w1', fullName: 'Worker', isActive: true },
    totalBonuses: 0,
    totalCommissions: 0,
    totalAdvances: 0,
    totalDebt: 0,
    totalPayments: 0,
    totalAdjustments: 0,
    totalReversals: 0,
    netFinancialPosition: 0,
    transactionCount: 0,
    ...overrides,
  };
}

describe('worker-profile-modules acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    financialRepoMock.aggregateWorkerTotals.mockResolvedValue(emptyFinanceSummary());
    financialRepoMock.findOpenCommissionByRef.mockResolvedValue(null);
    financialRepoMock.findReversalOf.mockResolvedValue(null);
    workerRepoMock.listWorkerAttributedFees.mockResolvedValue({
      sellerBonusTotal: 0,
      assemblerFeeTotal: 0,
      deliveryFeeTotal: 0,
      purchaseDriverFeeTotal: 0,
      installerFeeTotal: 0,
      items: [],
    });
    prismaMock.sale.count.mockResolvedValue(0);
    prismaMock.sale.aggregate.mockResolvedValue({
      _sum: { totalSalePrice: 0n, grossProfit: 0n, netProfit: 0n, installationCost: 0n, deliveryCost: 0n, installerFee: 0n },
      _max: { totalSalePrice: 0n },
    });
    prismaMock.store.findFirst.mockResolvedValue({ timezone: 'Asia/Tashkent' });
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.assemblyTask.findMany.mockResolvedValue([]);
    prismaMock.purchase.findMany.mockResolvedValue([]);
    prismaMock.workerFinancialTransaction.findMany.mockResolvedValue([]);
  });

  it('SELLER only → Umumiy + Sotuvchilik tabs', async () => {
    workerRepoMock.findWorkerInStore.mockResolvedValue({
      id: 'w1',
      fullName: 'Seller Only',
      username: 'seller',
      phone: null,
      role: UserRole.EMPLOYEE,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      responsibilities: [{ responsibility: WorkerResponsibility.SELLER }],
    });

    const modules = await getWorkerProfileModules(
      'store_1',
      { id: 'w1', role: UserRole.EMPLOYEE },
      'w1',
    );
    expect(modules.tabs).toEqual(['GENERAL', 'SELLER']);
    expect(modules.seller).not.toBeNull();
    expect(modules.assembler).toBeNull();
    expect(modules.delivery).toBeNull();
  });

  it('ASSEMBLER only → Umumiy + Ustalik', async () => {
    workerRepoMock.findWorkerInStore.mockResolvedValue({
      id: 'w1',
      fullName: 'Assembler',
      username: 'asm',
      phone: null,
      role: UserRole.EMPLOYEE,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      responsibilities: [{ responsibility: WorkerResponsibility.ASSEMBLER }],
    });
    const modules = await getWorkerProfileModules(
      'store_1',
      { id: 'admin', role: UserRole.ADMIN },
      'w1',
    );
    expect(modules.tabs).toEqual(['GENERAL', 'ASSEMBLER']);
    expect(modules.assembler).not.toBeNull();
    expect(assertCanManageWorkersMock).toHaveBeenCalled();
  });

  it('SELLER + ASSEMBLER + DELIVERY → three modules + general aggregates', async () => {
    workerRepoMock.findWorkerInStore.mockResolvedValue({
      id: 'w1',
      fullName: 'Multi',
      username: 'multi',
      phone: null,
      role: UserRole.EMPLOYEE,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      responsibilities: [
        { responsibility: WorkerResponsibility.SELLER },
        { responsibility: WorkerResponsibility.ASSEMBLER },
        { responsibility: WorkerResponsibility.DELIVERY },
      ],
    });
    financialRepoMock.aggregateWorkerTotals.mockResolvedValue(
      emptyFinanceSummary({
        totalCommissions: 950_000,
        totalPayments: 600_000,
        netFinancialPosition: 350_000,
      }),
    );
    workerRepoMock.listWorkerAttributedFees.mockResolvedValue({
      sellerBonusTotal: 300_000,
      assemblerFeeTotal: 500_000,
      deliveryFeeTotal: 150_000,
      purchaseDriverFeeTotal: 0,
      installerFeeTotal: 0,
      items: [{ kind: 'SELLER_BONUS' }, { kind: 'ASSEMBLER_FEE' }, { kind: 'DELIVERY_FEE' }],
    });

    const modules = await getWorkerProfileModules(
      'store_1',
      { id: 'w1', role: UserRole.EMPLOYEE },
      'w1',
    );
    expect(modules.tabs).toEqual(['GENERAL', 'SELLER', 'ASSEMBLER', 'DELIVERY']);
    expect(modules.general.finance.earned).toBe(950_000);
    expect(modules.general.finance.paid).toBe(600_000);
    expect(modules.general.finance.outstanding).toBe(350_000);
    expect(modules.general.breakdown.map((b) => b.responsibility)).toEqual([
      WorkerResponsibility.SELLER,
      WorkerResponsibility.ASSEMBLER,
      WorkerResponsibility.DELIVERY,
    ]);
    expect(modules.seller).not.toBeNull();
    expect(modules.assembler).not.toBeNull();
    expect(modules.delivery).not.toBeNull();
  });

  it('INSTALLER + SMM tabs when those responsibilities exist', async () => {
    workerRepoMock.findWorkerInStore.mockResolvedValue({
      id: 'w1',
      fullName: 'Inst Smm',
      username: 'is',
      phone: null,
      role: UserRole.EMPLOYEE,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      responsibilities: [
        { responsibility: WorkerResponsibility.INSTALLER },
        { responsibility: WorkerResponsibility.SMM },
      ],
    });
    const modules = await getWorkerProfileModules(
      'store_1',
      { id: 'w1', role: UserRole.EMPLOYEE },
      'w1',
    );
    expect(modules.tabs).toEqual(['GENERAL', 'INSTALLER', 'SMM']);
    expect(modules.installer).not.toBeNull();
    expect(modules.smm).not.toBeNull();
  });

  it('reconciliation marks differences when P&L ≠ ledger', async () => {
    prismaMock.sale.aggregate
      .mockResolvedValueOnce({ _sum: { installationCost: 5_200_000n } })
      .mockResolvedValueOnce({ _sum: { deliveryCost: 3_500_000n } })
      .mockResolvedValueOnce({ _sum: { installerFee: 1_000_000n } });
    prismaMock.purchase.aggregate.mockResolvedValue({ _sum: { driverFee: 400_000n } });
    prismaMock.workerFinancialTransaction.groupBy.mockResolvedValue([
      { responsibility: WorkerResponsibility.ASSEMBLER, _sum: { amount: 5_200_000n } },
      { responsibility: WorkerResponsibility.INSTALLER, _sum: { amount: 900_000n } },
    ]);
    prismaMock.workerFinancialTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 400_000n } })
      .mockResolvedValueOnce({ _sum: { amount: 3_500_000n } });

    const result = await getStoreFeeReconciliation('store_1', UserRole.ADMIN);
    expect(result.hasDifferences).toBe(true);
    const installer = result.rows.find((r) => r.kind === 'INSTALLER');
    expect(installer?.difference).toBe(100_000);
    const delivery = result.rows.find((r) => r.kind === 'DELIVERY');
    expect(delivery?.difference).toBe(0);
  });

  it('counts completed work on cancelled documents on the P&L side too', async () => {
    prismaMock.sale.aggregate.mockResolvedValue({ _sum: {} });
    prismaMock.purchase.aggregate.mockResolvedValue({ _sum: {} });
    prismaMock.workerFinancialTransaction.groupBy.mockResolvedValue([]);
    prismaMock.workerFinancialTransaction.aggregate.mockResolvedValue({ _sum: {} });

    await getStoreFeeReconciliation('store_1', UserRole.ADMIN);

    // Cancelled sales keep their completed fees on the ledger, so filtering them
    // out of the P&L aggregates would report a phantom difference.
    for (const call of prismaMock.sale.aggregate.mock.calls) {
      expect((call[0] as { where: Record<string, unknown> }).where).not.toHaveProperty('status');
    }
    expect(prismaMock.purchase.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deliveredAt: { not: null } }),
      }),
    );
  });
});
