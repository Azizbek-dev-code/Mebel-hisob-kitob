import {
  UserRole,
  WorkerFinancialTransactionType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findFirst: vi.fn(),
    },
    store: {
      findFirst: vi.fn(),
    },
    workerFinancialTransaction: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

const {
  createTransaction,
  getTransaction,
  getWorkerSummary,
  listWorkerTransactions,
  reverseTransaction,
} = await import('./worker-financial.service.js');

const STORE_ID = 'store_1';
const OTHER_STORE = 'store_2';
const ADMIN_ID = 'user_admin';
const WORKER_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxxx';
const TX_ID = 'clyyyyyyyyyyyyyyyyyyyyyyyyy';

const ACTIVE_WORKER = {
  id: WORKER_ID,
  storeId: STORE_ID,
  role: UserRole.EMPLOYEE,
  isActive: true,
  fullName: 'Ali Usta',
  responsibilities: [],
};

function txRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: TX_ID,
    storeId: STORE_ID,
    workerId: WORKER_ID,
    type: WorkerFinancialTransactionType.BONUS,
    amount: 500_000n,
    transactionDate: new Date('2026-08-09T12:00:00.000Z'),
    description: 'Ali ga bonus',
    referenceType: null,
    referenceId: null,
    reversesType: null,
    createdById: ADMIN_ID,
    createdAt: new Date('2026-08-09T12:05:00.000Z'),
    updatedAt: new Date('2026-08-09T12:05:00.000Z'),
    worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: true },
    createdBy: { id: ADMIN_ID, fullName: 'Store Administrator' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.store.findFirst.mockResolvedValue({
    id: STORE_ID,
    timezone: 'Asia/Tashkent',
  });
  prismaMock.workerFinancialTransaction.groupBy.mockResolvedValue([
    {
      type: WorkerFinancialTransactionType.COMMISSION,
      reversesType: null,
      _sum: { amount: 5_000_000n },
      _count: { _all: 1 },
    },
  ]);
  prismaMock.workerFinancialTransaction.findMany.mockResolvedValue([]);
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(prismaMock),
  );
});

describe('worker-financial.service createTransaction', () => {
  it.each([
    [WorkerFinancialTransactionType.BONUS, 500_000, 'Ali ga bonus'],
    [WorkerFinancialTransactionType.ADVANCE, 100_000, 'Avgust uchun avans'],
    [WorkerFinancialTransactionType.DEBT, 50_000, 'Oldingi qarz'],
    [WorkerFinancialTransactionType.PAYMENT, 150_000, 'Partial payment'],
    [WorkerFinancialTransactionType.ADJUSTMENT, 25_000, 'Manual correction'],
  ] as const)('creates a valid %s transaction', async (type, amount, description) => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_WORKER);
    prismaMock.workerFinancialTransaction.create.mockResolvedValue(
      txRecord({ type, amount: BigInt(amount), description }),
    );

    const transaction = await createTransaction(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      {
        workerId: WORKER_ID,
        type,
        amount,
        transactionDate: '2026-08-09',
        description,
      },
    );

    expect(transaction.type).toBe(type);
    expect(transaction.amount).toBe(amount);
    expect(transaction.description).toBe(description);
  });

  it('blocks PAYMENT that exceeds earned', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_WORKER);
    prismaMock.workerFinancialTransaction.groupBy.mockResolvedValue([
      {
        type: WorkerFinancialTransactionType.COMMISSION,
        reversesType: null,
        _sum: { amount: 200_000n },
        _count: { _all: 1 },
      },
    ]);

    await expect(
      createTransaction(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        {
          workerId: WORKER_ID,
          type: WorkerFinancialTransactionType.PAYMENT,
          amount: 300_000,
          transactionDate: '2026-08-09',
          description: 'Overpay',
        },
      ),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('creates COMMISSION with required reference', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_WORKER);
    prismaMock.workerFinancialTransaction.create.mockResolvedValue(
      txRecord({
        type: WorkerFinancialTransactionType.COMMISSION,
        amount: 200_000n,
        description: 'August commission',
        referenceType: 'MANUAL',
        referenceId: 'manual:aug',
      }),
    );

    const transaction = await createTransaction(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      {
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.COMMISSION,
        amount: 200_000,
        transactionDate: '2026-08-09',
        description: 'August commission',
        referenceType: 'MANUAL',
        referenceId: 'manual:aug',
      },
    );
    expect(transaction.referenceId).toBe('manual:aug');
  });

  it('rejects COMMISSION without reference', async () => {
    await expect(
      createTransaction(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        {
          workerId: WORKER_ID,
          type: WorkerFinancialTransactionType.COMMISSION,
          amount: 200_000,
          transactionDate: '2026-08-09',
        },
      ),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('persists amount as BigInt so\'m and preserves transactionDate', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_WORKER);
    prismaMock.workerFinancialTransaction.create.mockResolvedValue(
      txRecord({ amount: 1_250_000n }),
    );

    await createTransaction(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      {
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.BONUS,
        amount: 1_250_000,
        transactionDate: '2026-08-15',
      },
    );

    const createArgs = prismaMock.workerFinancialTransaction.create.mock.calls[0]![0] as {
      data: { amount: bigint; transactionDate: Date; createdById: string; storeId: string };
    };
    expect(typeof createArgs.data.amount).toBe('bigint');
    expect(createArgs.data.amount).toBe(1_250_000n);
    expect(createArgs.data.transactionDate.toISOString()).toContain('2026-08-15');
    expect(createArgs.data.createdById).toBe(ADMIN_ID);
    expect(createArgs.data.storeId).toBe(STORE_ID);
  });

  it('trims description and turns empty string into null', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_WORKER);
    prismaMock.workerFinancialTransaction.create.mockResolvedValue(
      txRecord({ description: null }),
    );

    await createTransaction(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      {
        workerId: WORKER_ID,
        type: WorkerFinancialTransactionType.BONUS,
        amount: 10_000,
        transactionDate: '2026-08-09',
        description: '   ',
      },
    );

    expect(prismaMock.workerFinancialTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: null }),
      }),
    );
  });

  it('rejects zero amount', async () => {
    await expect(
      createTransaction(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        {
          workerId: WORKER_ID,
          type: WorkerFinancialTransactionType.BONUS,
          amount: 0,
          transactionDate: '2026-08-09',
        },
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });
    expect(prismaMock.workerFinancialTransaction.create).not.toHaveBeenCalled();
  });

  it('rejects negative amount', async () => {
    await expect(
      createTransaction(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        {
          workerId: WORKER_ID,
          type: WorkerFinancialTransactionType.BONUS,
          amount: -100,
          transactionDate: '2026-08-09',
        },
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });
    expect(prismaMock.workerFinancialTransaction.create).not.toHaveBeenCalled();
  });

  it('rejects unknown worker', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(
      createTransaction(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        {
          workerId: WORKER_ID,
          type: WorkerFinancialTransactionType.BONUS,
          amount: 100_000,
          transactionDate: '2026-08-09',
        },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: WORKER_ID, storeId: STORE_ID },
      }),
    );
    expect(prismaMock.workerFinancialTransaction.create).not.toHaveBeenCalled();
  });

  it('rejects cross-store worker (looks like not found)', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(
      createTransaction(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        {
          workerId: 'clzzzzzzzzzzzzzzzzzzzzzzzzz',
          type: WorkerFinancialTransactionType.BONUS,
          amount: 100_000,
          transactionDate: '2026-08-09',
        },
      ),
    ).rejects.toBeInstanceOf(ApiError);

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'clzzzzzzzzzzzzzzzzzzzzzzzzz', storeId: STORE_ID },
      }),
    );
  });

  it('rejects PLATFORM_ADMIN / non-employee as worker', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      ...ACTIVE_WORKER,
      role: UserRole.ADMIN,
    });

    await expect(
      createTransaction(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        {
          workerId: WORKER_ID,
          type: WorkerFinancialTransactionType.BONUS,
          amount: 100_000,
          transactionDate: '2026-08-09',
        },
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });
  });

  it('rejects inactive worker for new transactions', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      ...ACTIVE_WORKER,
      isActive: false,
    });

    await expect(
      createTransaction(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        {
          workerId: WORKER_ID,
          type: WorkerFinancialTransactionType.BONUS,
          amount: 100_000,
          transactionDate: '2026-08-09',
        },
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });
  });

  it('ignores client-supplied storeId / createdById (never reaches create data)', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_WORKER);
    prismaMock.workerFinancialTransaction.create.mockResolvedValue(txRecord());

    const smuggled = {
      workerId: WORKER_ID,
      type: WorkerFinancialTransactionType.BONUS,
      amount: 100_000,
      transactionDate: '2026-08-09',
      storeId: OTHER_STORE,
      createdById: 'user_attacker',
    };

    await createTransaction(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, smuggled);

    const data = (
      prismaMock.workerFinancialTransaction.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      }
    ).data;
    expect(data.storeId).toBe(STORE_ID);
    expect(data.createdById).toBe(ADMIN_ID);
  });

  it('forbids EMPLOYEE from creating', async () => {
    await expect(
      createTransaction(
        STORE_ID,
        { id: WORKER_ID, role: UserRole.EMPLOYEE },
        {
          workerId: WORKER_ID,
          type: WorkerFinancialTransactionType.BONUS,
          amount: 100_000,
          transactionDate: '2026-08-09',
        },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(prismaMock.workerFinancialTransaction.create).not.toHaveBeenCalled();
  });
});

describe('worker-financial.service list + summary', () => {
  it('lists transactions scoped to store and worker', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_WORKER);
    prismaMock.workerFinancialTransaction.findMany.mockResolvedValue([txRecord()]);
    prismaMock.workerFinancialTransaction.count.mockResolvedValue(1);

    const result = await listWorkerTransactions({
      storeId: STORE_ID,
      actor: { id: ADMIN_ID, role: UserRole.ADMIN },
      workerId: WORKER_ID,
    });

    expect(result.items).toHaveLength(1);
    expect(prismaMock.workerFinancialTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: STORE_ID, workerId: WORKER_ID },
      }),
    );
  });

  it('allows EMPLOYEE to list own finances and forbids other workers', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_WORKER);
    prismaMock.workerFinancialTransaction.findMany.mockResolvedValue([txRecord()]);
    prismaMock.workerFinancialTransaction.count.mockResolvedValue(1);

    await expect(
      listWorkerTransactions({
        storeId: STORE_ID,
        actor: { id: WORKER_ID, role: UserRole.EMPLOYEE },
        workerId: WORKER_ID,
      }),
    ).resolves.toMatchObject({ items: expect.any(Array) });

    await expect(
      listWorkerTransactions({
        storeId: STORE_ID,
        actor: { id: WORKER_ID, role: UserRole.EMPLOYEE },
        workerId: 'other_worker',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('still lists historical transactions when worker is inactive', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      ...ACTIVE_WORKER,
      isActive: false,
    });
    prismaMock.workerFinancialTransaction.findMany.mockResolvedValue([
      txRecord({ worker: { id: WORKER_ID, fullName: 'Ali Usta', isActive: false } }),
    ]);
    prismaMock.workerFinancialTransaction.count.mockResolvedValue(1);

    const result = await listWorkerTransactions({
      storeId: STORE_ID,
      actor: { id: ADMIN_ID, role: UserRole.ADMIN },
      workerId: WORKER_ID,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.worker.isActive).toBe(false);
  });

  it('aggregates summary totals correctly', async () => {
    prismaMock.user.findFirst
      .mockResolvedValueOnce(ACTIVE_WORKER)
      .mockResolvedValueOnce({
        id: WORKER_ID,
        fullName: 'Ali Usta',
        isActive: true,
      });
    prismaMock.workerFinancialTransaction.groupBy.mockResolvedValue([
      {
        type: WorkerFinancialTransactionType.BONUS,
        reversesType: null,
        _sum: { amount: 500_000n },
        _count: { _all: 1 },
      },
      {
        type: WorkerFinancialTransactionType.COMMISSION,
        reversesType: null,
        _sum: { amount: 200_000n },
        _count: { _all: 1 },
      },
      {
        type: WorkerFinancialTransactionType.ADVANCE,
        reversesType: null,
        _sum: { amount: 100_000n },
        _count: { _all: 1 },
      },
      {
        type: WorkerFinancialTransactionType.DEBT,
        reversesType: null,
        _sum: { amount: 50_000n },
        _count: { _all: 1 },
      },
      {
        type: WorkerFinancialTransactionType.PAYMENT,
        reversesType: null,
        _sum: { amount: 150_000n },
        _count: { _all: 1 },
      },
      {
        type: WorkerFinancialTransactionType.ADJUSTMENT,
        reversesType: null,
        _sum: { amount: 25_000n },
        _count: { _all: 1 },
      },
    ]);

    const summary = await getWorkerSummary(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID);

    expect(summary.totalBonuses).toBe(500_000);
    expect(summary.totalCommissions).toBe(200_000);
    expect(summary.totalAdvances).toBe(100_000);
    expect(summary.totalDebt).toBe(50_000);
    expect(summary.totalPayments).toBe(150_000);
    expect(summary.totalAdjustments).toBe(25_000);
    expect(summary.totalReversals).toBe(0);
    expect(summary.transactionCount).toBe(6);
    expect(summary.netFinancialPosition).toBe(425_000);
    expect(prismaMock.workerFinancialTransaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['type', 'reversesType'],
        where: { storeId: STORE_ID, workerId: WORKER_ID },
      }),
    );
  });

  it('filters list and summary by store-timezone inclusive date range', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_WORKER);
    prismaMock.workerFinancialTransaction.findMany.mockResolvedValue([]);
    prismaMock.workerFinancialTransaction.count.mockResolvedValue(0);
    prismaMock.workerFinancialTransaction.groupBy.mockResolvedValue([]);

    await listWorkerTransactions({
      storeId: STORE_ID,
      actor: { id: ADMIN_ID, role: UserRole.ADMIN },
      workerId: WORKER_ID,
      from: '2026-08-01',
      to: '2026-08-31',
      type: WorkerFinancialTransactionType.BONUS,
    });

    expect(prismaMock.workerFinancialTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          storeId: STORE_ID,
          workerId: WORKER_ID,
          type: WorkerFinancialTransactionType.BONUS,
          transactionDate: {
            gte: new Date('2026-07-31T19:00:00.000Z'),
            lt: new Date('2026-08-31T19:00:00.000Z'),
          },
        }),
        skip: 0,
        take: 20,
      }),
    );

    await getWorkerSummary(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID, {
      from: '2026-08-01',
      to: '2026-08-31',
    });

    expect(prismaMock.workerFinancialTransaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          transactionDate: {
            gte: new Date('2026-07-31T19:00:00.000Z'),
            lt: new Date('2026-08-31T19:00:00.000Z'),
          },
        }),
      }),
    );
  });

  it('paginates in the database via skip/take', async () => {
    prismaMock.user.findFirst.mockResolvedValue(ACTIVE_WORKER);
    prismaMock.workerFinancialTransaction.findMany.mockResolvedValue([]);
    prismaMock.workerFinancialTransaction.count.mockResolvedValue(45);

    const result = await listWorkerTransactions({
      storeId: STORE_ID,
      actor: { id: ADMIN_ID, role: UserRole.ADMIN },
      workerId: WORKER_ID,
      page: 2,
      pageSize: 10,
    });

    expect(prismaMock.workerFinancialTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
    expect(result.meta).toMatchObject({
      page: 2,
      pageSize: 10,
      totalItems: 45,
      totalPages: 5,
    });
  });

  it('returns 404 for cross-store worker summary', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(
      getWorkerSummary(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('worker-financial.service getTransaction + reverse', () => {
  it('returns a store-scoped transaction detail', async () => {
    prismaMock.workerFinancialTransaction.findFirst.mockResolvedValue(txRecord());

    const transaction = await getTransaction(STORE_ID, UserRole.ADMIN, TX_ID);
    expect(transaction.id).toBe(TX_ID);
    expect(prismaMock.workerFinancialTransaction.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TX_ID, storeId: STORE_ID },
      }),
    );
  });

  it('returns 404 for missing / cross-store transaction', async () => {
    prismaMock.workerFinancialTransaction.findFirst.mockResolvedValue(null);
    await expect(getTransaction(STORE_ID, UserRole.ADMIN, TX_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it.each([
    [WorkerFinancialTransactionType.BONUS, 500_000],
    [WorkerFinancialTransactionType.COMMISSION, 1_000_000],
    [WorkerFinancialTransactionType.ADVANCE, 300_000],
    [WorkerFinancialTransactionType.DEBT, 200_000],
    [WorkerFinancialTransactionType.PAYMENT, 500_000],
  ] as const)('reverses %s and leaves original unchanged', async (type, amount) => {
    const original = txRecord({ type, amount: BigInt(amount) });
    const reversalRow = txRecord({
      id: 'clzzzzzzzzzzzzzzzzzzzzzzzzz',
      type: WorkerFinancialTransactionType.REVERSAL,
      amount: BigInt(amount),
      referenceType: 'REVERSAL',
      referenceId: TX_ID,
      reversesType: type,
      description: `Reversal of ${type} ${TX_ID}`,
    });

    prismaMock.workerFinancialTransaction.findFirst
      .mockResolvedValueOnce(original) // findTransactionRecordInStore
      .mockResolvedValueOnce(null) // findReversalOf
      .mockResolvedValueOnce(original); // findTransactionInStore after create
    prismaMock.workerFinancialTransaction.create.mockResolvedValue(reversalRow);

    const result = await reverseTransaction(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, TX_ID);

    expect(result.original.type).toBe(type);
    expect(result.original.amount).toBe(amount);
    expect(result.reversal.type).toBe(WorkerFinancialTransactionType.REVERSAL);
    expect(result.reversal.referenceId).toBe(TX_ID);
    expect(result.reversal.reversesType).toBe(type);
    expect(result.reversal.createdBy?.id).toBe(ADMIN_ID);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.workerFinancialTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: WorkerFinancialTransactionType.REVERSAL,
          amount: BigInt(amount),
          referenceType: 'REVERSAL',
          referenceId: TX_ID,
          reversesType: type,
          createdById: ADMIN_ID,
          storeId: STORE_ID,
        }),
      }),
    );
  });

  it('rejects duplicate reversal', async () => {
    prismaMock.workerFinancialTransaction.findFirst
      .mockResolvedValueOnce(txRecord())
      .mockResolvedValueOnce(txRecord({ type: WorkerFinancialTransactionType.REVERSAL }));

    await expect(
      reverseTransaction(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, TX_ID),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(prismaMock.workerFinancialTransaction.create).not.toHaveBeenCalled();
  });

  it('rejects reversing a REVERSAL', async () => {
    prismaMock.workerFinancialTransaction.findFirst.mockResolvedValue(
      txRecord({ type: WorkerFinancialTransactionType.REVERSAL, reversesType: 'BONUS' }),
    );

    await expect(
      reverseTransaction(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, TX_ID),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('forbids EMPLOYEE from reversing', async () => {
    await expect(
      reverseTransaction(STORE_ID, { id: WORKER_ID, role: UserRole.EMPLOYEE }, TX_ID),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns 404 for cross-store reversal', async () => {
    prismaMock.workerFinancialTransaction.findFirst.mockResolvedValue(null);
    await expect(
      reverseTransaction(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, TX_ID),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('summary net becomes zero after reversing a BONUS', async () => {
    prismaMock.user.findFirst
      .mockResolvedValueOnce(ACTIVE_WORKER)
      .mockResolvedValueOnce({ id: WORKER_ID, fullName: 'Ali Usta', isActive: true });
    prismaMock.workerFinancialTransaction.groupBy.mockResolvedValue([
      {
        type: WorkerFinancialTransactionType.BONUS,
        reversesType: null,
        _sum: { amount: 500_000n },
        _count: { _all: 1 },
      },
      {
        type: WorkerFinancialTransactionType.REVERSAL,
        reversesType: WorkerFinancialTransactionType.BONUS,
        _sum: { amount: 500_000n },
        _count: { _all: 1 },
      },
    ]);

    const summary = await getWorkerSummary(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID);
    expect(summary.totalBonuses).toBe(500_000);
    expect(summary.totalReversals).toBe(500_000);
    expect(summary.netFinancialPosition).toBe(0);
  });
});
