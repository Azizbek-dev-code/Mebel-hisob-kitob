import {
  SaleStatus,
  SellerCommissionStatus,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { financialRepoMock, compensationRepoMock, prismaMock } = vi.hoisted(() => ({
  financialRepoMock: {
    createTransaction: vi.fn(),
    findReversalOf: vi.fn(),
    closeOpenCommission: vi.fn(),
  },
  compensationRepoMock: {
    listRulesForWorker: vi.fn(),
  },
  prismaMock: {
    workerFinancialTransaction: {
      findMany: vi.fn(),
    },
    sale: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../repositories/worker-financial.repository.js', () => financialRepoMock);
vi.mock('../repositories/worker-compensation.repository.js', () => compensationRepoMock);
vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { deriveSellerCommissionStatus, syncSellerCommissionForSale } = await import(
  './seller-commission.service.js'
);

describe('deriveSellerCommissionStatus', () => {
  it('marks cancelled sales as CANCELLED', () => {
    expect(
      deriveSellerCommissionStatus({
        saleStatus: SaleStatus.CANCELLED,
        estimated: 300_000,
        earned: 0,
        reversed: true,
        workerPaid: 0,
        workerEarned: 0,
      }),
    ).toBe(SellerCommissionStatus.CANCELLED);
  });

  it('marks posted unpaid commission as EARNED', () => {
    expect(
      deriveSellerCommissionStatus({
        saleStatus: SaleStatus.ACTIVE,
        estimated: 300_000,
        earned: 300_000,
        reversed: false,
        workerPaid: 0,
        workerEarned: 300_000,
      }),
    ).toBe(SellerCommissionStatus.EARNED);
  });

  it('marks partial worker payment as PARTIALLY_PAID', () => {
    expect(
      deriveSellerCommissionStatus({
        saleStatus: SaleStatus.ACTIVE,
        estimated: 300_000,
        earned: 300_000,
        reversed: false,
        workerPaid: 150_000,
        workerEarned: 600_000,
      }),
    ).toBe(SellerCommissionStatus.PARTIALLY_PAID);
  });

  it('marks fully paid worker as PAID', () => {
    expect(
      deriveSellerCommissionStatus({
        saleStatus: SaleStatus.COMPLETED,
        estimated: 300_000,
        earned: 300_000,
        reversed: false,
        workerPaid: 600_000,
        workerEarned: 600_000,
      }),
    ).toBe(SellerCommissionStatus.PAID);
  });
});

describe('syncSellerCommissionForSale historical saleDate', () => {
  const augustSaleDate = new Date('2026-08-15T10:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    financialRepoMock.findReversalOf.mockResolvedValue(null);
    financialRepoMock.createTransaction.mockResolvedValue({ id: 'tx_new' });
    financialRepoMock.closeOpenCommission.mockResolvedValue(undefined);
  });

  it('posts COMMISSION with transactionDate = sale.saleDate (August historical)', async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: 'sale_aug',
      saleNumber: 7,
      saleDate: augustSaleDate,
      status: SaleStatus.ACTIVE,
      sellerId: 'seller_1',
      totalSalePrice: 10_000_000n,
      grossProfit: 2_000_000n,
      netProfit: 1_500_000n,
      items: [{ productName: 'Divan' }],
      workerCompensations: [],
    });
    compensationRepoMock.listRulesForWorker.mockResolvedValue([
      {
        id: 'rule_1',
        type: 'PERCENT_OF_SALE',
        value: 500, // 5% in basis points
        isActive: true,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        effectiveTo: null,
      },
    ]);
    prismaMock.workerFinancialTransaction.findMany.mockResolvedValue([]);

    const result = await syncSellerCommissionForSale({
      storeId: 'store_1',
      saleId: 'sale_aug',
      actorId: 'admin_1',
    });

    expect(result.posted).toBe(1);
    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkerFinancialTransactionType.COMMISSION,
        referenceType: WorkerFinancialReferenceType.COMPENSATION,
        responsibility: WorkerResponsibility.SELLER,
        transactionDate: augustSaleDate,
        amount: 500_000,
      }),
      undefined,
    );
  });

  it('reverses mismatched open commission on original transactionDate (not today)', async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: 'sale_aug',
      saleNumber: 7,
      saleDate: augustSaleDate,
      status: SaleStatus.ACTIVE,
      sellerId: 'seller_1',
      totalSalePrice: 10_000_000n,
      grossProfit: 2_000_000n,
      netProfit: 1_500_000n,
      items: [{ productName: 'Divan' }],
      workerCompensations: [],
    });
    compensationRepoMock.listRulesForWorker.mockResolvedValue([
      {
        id: 'rule_1',
        type: 'PERCENT_OF_SALE',
        value: 1000, // 10% in basis points
        isActive: true,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        effectiveTo: null,
      },
    ]);
    prismaMock.workerFinancialTransaction.findMany.mockResolvedValue([
      {
        id: 'tx_old',
        workerId: 'seller_1',
        amount: 300_000n,
        type: WorkerFinancialTransactionType.COMMISSION,
        description: 'old',
        referenceId: 'sale_aug:PERCENT_OF_SALE',
        responsibility: WorkerResponsibility.SELLER,
        transactionDate: augustSaleDate,
        isOpen: true,
        referenceType: WorkerFinancialReferenceType.COMPENSATION,
      },
    ]);

    await syncSellerCommissionForSale({
      storeId: 'store_1',
      saleId: 'sale_aug',
      actorId: 'admin_1',
    });

    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkerFinancialTransactionType.REVERSAL,
        referenceId: 'tx_old',
        transactionDate: augustSaleDate,
      }),
      undefined,
    );
    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkerFinancialTransactionType.COMMISSION,
        transactionDate: augustSaleDate,
        amount: 1_000_000,
      }),
      undefined,
    );
  });

  it('re-posts commission when only saleDate month changes', async () => {
    const august = new Date('2026-08-15T10:00:00.000Z');
    const september = new Date('2026-09-01T10:00:00.000Z');
    prismaMock.sale.findFirst.mockResolvedValue({
      id: 'sale_move',
      saleNumber: 9,
      saleDate: september,
      status: SaleStatus.ACTIVE,
      sellerId: 'seller_1',
      totalSalePrice: 10_000_000n,
      grossProfit: 2_000_000n,
      netProfit: 1_500_000n,
      items: [{ productName: 'Divan' }],
      workerCompensations: [],
    });
    compensationRepoMock.listRulesForWorker.mockResolvedValue([
      {
        id: 'rule_1',
        type: 'PERCENT_OF_SALE',
        value: 500,
        isActive: true,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        effectiveTo: null,
      },
    ]);
    prismaMock.workerFinancialTransaction.findMany.mockResolvedValue([
      {
        id: 'tx_aug',
        workerId: 'seller_1',
        amount: 500_000n,
        type: WorkerFinancialTransactionType.COMMISSION,
        description: 'old',
        referenceId: 'sale_move:PERCENT_OF_SALE',
        responsibility: WorkerResponsibility.SELLER,
        transactionDate: august,
        isOpen: true,
        referenceType: WorkerFinancialReferenceType.COMPENSATION,
      },
    ]);

    const result = await syncSellerCommissionForSale({
      storeId: 'store_1',
      saleId: 'sale_move',
      actorId: 'admin_1',
    });

    expect(result.reversed).toBe(1);
    expect(result.posted).toBe(1);
    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkerFinancialTransactionType.REVERSAL,
        referenceId: 'tx_aug',
        transactionDate: august,
      }),
      undefined,
    );
    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkerFinancialTransactionType.COMMISSION,
        transactionDate: september,
        amount: 500_000,
      }),
      undefined,
    );
  });

  it('posts commission for August saleDate when rule effectiveFrom is today (backfill)', async () => {
    prismaMock.sale.findFirst.mockResolvedValue({
      id: 'sale_aug_backfill',
      saleNumber: 11,
      saleDate: augustSaleDate,
      status: SaleStatus.ACTIVE,
      sellerId: 'seller_1',
      totalSalePrice: 10_000_000n,
      grossProfit: 2_000_000n,
      netProfit: 1_500_000n,
      items: [{ productName: 'Divan' }],
      workerCompensations: [],
    });
    compensationRepoMock.listRulesForWorker.mockResolvedValue([
      {
        id: 'rule_today',
        type: 'PERCENT_OF_SALE',
        value: 1000,
        isActive: true,
        effectiveFrom: new Date('2026-09-18T12:00:00.000Z'),
        effectiveTo: null,
      },
    ]);
    prismaMock.workerFinancialTransaction.findMany.mockResolvedValue([]);

    const result = await syncSellerCommissionForSale({
      storeId: 'store_1',
      saleId: 'sale_aug_backfill',
      actorId: 'admin_1',
    });

    expect(result.posted).toBe(1);
    expect(financialRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WorkerFinancialTransactionType.COMMISSION,
        transactionDate: augustSaleDate,
        amount: 1_000_000,
      }),
      undefined,
    );
  });
});
