import {
  DEFAULT_PERSONAL_CATEGORIES,
  DEFAULT_PERSONAL_WALLETS,
  ExpenseStatus,
  PersonalCategoryKind,
  PersonalEntryType,
  PersonalWalletKind,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock, tryAwardXpMock, tryEvaluateAchievementsMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    personalWallet: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    personalCategory: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    personalEntry: {
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    personalTransfer: {
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  recordAuditMock: vi.fn(),
  tryAwardXpMock: vi.fn(),
  tryEvaluateAchievementsMock: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('../growth/personal-growth-xp.service.js', () => ({ tryAwardXp: tryAwardXpMock }));
vi.mock('../growth/personal-growth-achievements.service.js', () => ({
  tryEvaluateAchievements: tryEvaluateAchievementsMock,
}));

const {
  cancelPersonalTransfer,
  createPersonalEntry,
  createPersonalTransfer,
  ensurePersonalLedger,
  getPersonalSummary,
  listPersonalHistory,
  listPersonalWallets,
  updatePersonalCategory,
  updatePersonalWallet,
} = await import('./personal-ledger.service.js');

const WORKSPACE = {
  id: 'ws_1',
  type: WorkspaceType.PERSONAL,
  status: 'ACTIVE',
  storeId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  tryAwardXpMock.mockResolvedValue(undefined);
  tryEvaluateAchievementsMock.mockResolvedValue(undefined);
  prismaMock.workspace.findUnique.mockResolvedValue(WORKSPACE);
  prismaMock.personalWallet.count.mockResolvedValue(0);
  prismaMock.personalCategory.count.mockResolvedValue(0);
  prismaMock.personalWallet.createMany.mockResolvedValue({ count: 1 });
  prismaMock.personalCategory.createMany.mockResolvedValue({ count: DEFAULT_PERSONAL_CATEGORIES.length });
  prismaMock.personalEntry.groupBy.mockResolvedValue([]);
  prismaMock.personalTransfer.groupBy.mockResolvedValue([]);
  prismaMock.personalTransfer.findMany.mockResolvedValue([]);
  prismaMock.personalEntry.findMany.mockResolvedValue([]);
});

describe('ensurePersonalLedger', () => {
  it('seeds wallets and categories without a storeId', async () => {
    await ensurePersonalLedger('ws_1');
    const walletData = prismaMock.personalWallet.createMany.mock.calls[0][0].data;
    const categoryData = prismaMock.personalCategory.createMany.mock.calls[0][0].data;
    expect(walletData).toHaveLength(DEFAULT_PERSONAL_WALLETS.length);
    expect(categoryData).toHaveLength(DEFAULT_PERSONAL_CATEGORIES.length);
    expect(JSON.stringify(walletData)).not.toMatch(/storeId/);
    expect(JSON.stringify(categoryData)).not.toMatch(/storeId/);
    expect(categoryData.some((row: { kind: string }) => row.kind === PersonalCategoryKind.INCOME)).toBe(
      true,
    );
  });
});

describe('listPersonalWallets', () => {
  it('adds opening balance to income minus expense', async () => {
    prismaMock.personalWallet.count.mockResolvedValue(1);
    prismaMock.personalCategory.count.mockResolvedValue(1);
    prismaMock.personalWallet.findMany.mockResolvedValue([
      {
        id: 'wal_1',
        name: 'Naqd',
        kind: PersonalWalletKind.CASH,
        openingBalanceSom: 10_000n,
        sortOrder: 0,
        isArchived: false,
      },
    ]);
    prismaMock.personalEntry.groupBy.mockResolvedValue([
      { walletId: 'wal_1', type: PersonalEntryType.INCOME, _sum: { amount: 5_000n } },
      { walletId: 'wal_1', type: PersonalEntryType.EXPENSE, _sum: { amount: 2_000n } },
    ]);

    const wallets = await listPersonalWallets('ws_1');
    expect(wallets[0]?.balanceSom).toBe(13_000);
    expect(JSON.stringify(wallets)).not.toMatch(/storeId/);
  });
});

describe('createPersonalEntry', () => {
  it('stores a positive BigInt amount on a personal wallet', async () => {
    prismaMock.personalWallet.count.mockResolvedValue(1);
    prismaMock.personalCategory.count.mockResolvedValue(1);
    prismaMock.personalWallet.findFirst.mockResolvedValue({
      id: 'wal_1',
      workspaceId: 'ws_1',
      isArchived: false,
    });
    prismaMock.personalCategory.findFirst.mockResolvedValue({
      id: 'cat_1',
      workspaceId: 'ws_1',
      kind: PersonalCategoryKind.EXPENSE,
      isActive: true,
    });
    prismaMock.personalEntry.create.mockResolvedValue({
      id: 'ent_1',
      type: PersonalEntryType.EXPENSE,
      amount: 4_000n,
      occurredAt: new Date('2026-09-13T12:00:00.000Z'),
      note: null,
      status: ExpenseStatus.ACTIVE,
      createdAt: new Date('2026-09-13T12:00:00.000Z'),
      wallet: { id: 'wal_1', name: 'Naqd', kind: PersonalWalletKind.CASH },
      category: {
        id: 'cat_1',
        name: 'Oziq-ovqat',
        color: 'teal',
        kind: PersonalCategoryKind.EXPENSE,
      },
    });

    const entry = await createPersonalEntry('ws_1', 'idn_1', {
      type: PersonalEntryType.EXPENSE,
      walletId: 'wal_1',
      categoryId: 'cat_1',
      amount: 4_000,
      occurredAt: '2026-09-13',
    });

    expect(prismaMock.personalEntry.create.mock.calls[0][0].data.amount).toBe(4_000n);
    expect(prismaMock.personalEntry.create.mock.calls[0][0].data).not.toHaveProperty('storeId');
    expect(entry.amount).toBe(4_000);
    expect(tryAwardXpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'FINANCE_DISCIPLINE',
        sourceEntityId: 'finance-log:2026-09-13',
        dayKey: '2026-09-13',
      }),
    );
    expect(tryEvaluateAchievementsMock).toHaveBeenCalledWith('ws_1', 'idn_1');
  });
});

describe('getPersonalSummary', () => {
  it('never returns store expense fields', async () => {
    prismaMock.personalWallet.count.mockResolvedValue(1);
    prismaMock.personalCategory.count.mockResolvedValue(1);
    prismaMock.personalWallet.findMany.mockResolvedValue([
      {
        id: 'wal_1',
        name: 'Naqd',
        kind: PersonalWalletKind.CASH,
        openingBalanceSom: 0n,
        sortOrder: 0,
        isArchived: false,
      },
    ]);
    prismaMock.personalEntry.findMany.mockResolvedValue([]);

    const summary = await getPersonalSummary('ws_1');
    expect(summary).toEqual(
      expect.objectContaining({
        totalBalanceSom: 0,
        monthIncomeSom: 0,
        monthExpenseSom: 0,
      }),
    );
    expect(JSON.stringify(summary)).not.toMatch(/storeId/);
    expect(summary.monthNetSom).toBe(0);
    expect(summary.recentActivity).toEqual([]);
  });
});

describe('createPersonalTransfer', () => {
  const wallets = {
    wal_1: {
      id: 'wal_1',
      workspaceId: 'ws_1',
      isArchived: false,
      name: 'Naqd',
      kind: PersonalWalletKind.CASH,
    },
    wal_2: {
      id: 'wal_2',
      workspaceId: 'ws_1',
      isArchived: false,
      name: 'Karta',
      kind: PersonalWalletKind.CARD,
    },
  };

  it('moves money between wallets without counting as expense', async () => {
    prismaMock.personalWallet.count.mockResolvedValue(2);
    prismaMock.personalCategory.count.mockResolvedValue(1);
    prismaMock.personalWallet.findFirst.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(wallets[where.id as keyof typeof wallets] ?? null),
    );
    prismaMock.personalTransfer.create.mockResolvedValue({
      id: 'tr_1',
      amount: 3_000n,
      occurredAt: new Date('2026-09-13T12:00:00.000Z'),
      note: null,
      status: ExpenseStatus.ACTIVE,
      createdAt: new Date('2026-09-13T12:00:00.000Z'),
      fromWallet: { id: 'wal_1', name: 'Naqd', kind: PersonalWalletKind.CASH },
      toWallet: { id: 'wal_2', name: 'Karta', kind: PersonalWalletKind.CARD },
    });

    const transfer = await createPersonalTransfer('ws_1', 'idn_1', {
      fromWalletId: 'wal_1',
      toWalletId: 'wal_2',
      amount: 3_000,
      occurredAt: '2026-09-13',
    });

    expect(transfer.amount).toBe(3_000);
    expect(prismaMock.personalTransfer.create.mock.calls[0][0].data).not.toHaveProperty('storeId');
    expect(prismaMock.personalEntry.create).not.toHaveBeenCalled();
  });

  it('rejects a transfer onto the same wallet', async () => {
    prismaMock.personalWallet.count.mockResolvedValue(1);
    prismaMock.personalCategory.count.mockResolvedValue(1);
    await expect(
      createPersonalTransfer('ws_1', 'idn_1', {
        fromWalletId: 'wal_1',
        toWalletId: 'wal_1',
        amount: 1_000,
        occurredAt: '2026-09-13',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(prismaMock.personalTransfer.create).not.toHaveBeenCalled();
  });
});

describe('wallet balances include transfers', () => {
  it('adds incoming transfers and subtracts outgoing ones', async () => {
    prismaMock.personalWallet.count.mockResolvedValue(2);
    prismaMock.personalCategory.count.mockResolvedValue(1);
    prismaMock.personalWallet.findMany.mockResolvedValue([
      {
        id: 'wal_1',
        name: 'Naqd',
        kind: PersonalWalletKind.CASH,
        openingBalanceSom: 10_000n,
        sortOrder: 0,
        isArchived: false,
      },
      {
        id: 'wal_2',
        name: 'Karta',
        kind: PersonalWalletKind.CARD,
        openingBalanceSom: 0n,
        sortOrder: 1,
        isArchived: false,
      },
    ]);
    prismaMock.personalEntry.groupBy.mockResolvedValue([]);
    prismaMock.personalTransfer.groupBy.mockImplementation(
      async ({ by }: { by: string[] }) => {
        if (by[0] === 'fromWalletId') {
          return [{ fromWalletId: 'wal_1', _sum: { amount: 3_000n } }];
        }
        return [{ toWalletId: 'wal_2', _sum: { amount: 3_000n } }];
      },
    );

    const wallets = await listPersonalWallets('ws_1');
    expect(wallets[0]?.balanceSom).toBe(7_000);
    expect(wallets[1]?.balanceSom).toBe(3_000);
  });
});

describe('getPersonalSummary ignores transfers for month KPIs', () => {
  it('keeps month expense at zero after a transfer', async () => {
    prismaMock.personalWallet.count.mockResolvedValue(1);
    prismaMock.personalCategory.count.mockResolvedValue(1);
    prismaMock.personalWallet.findMany.mockResolvedValue([
      {
        id: 'wal_1',
        name: 'Naqd',
        kind: PersonalWalletKind.CASH,
        openingBalanceSom: 7_000n,
        sortOrder: 0,
        isArchived: false,
      },
    ]);
    prismaMock.personalEntry.groupBy.mockResolvedValue([]);
    prismaMock.personalTransfer.groupBy.mockResolvedValue([]);
    prismaMock.personalTransfer.findMany.mockResolvedValue([]);

    const summary = await getPersonalSummary('ws_1');
    expect(summary.monthIncomeSom).toBe(0);
    expect(summary.monthExpenseSom).toBe(0);
    expect(summary.monthNetSom).toBe(0);
  });
});

describe('updatePersonalWallet archive', () => {
  it('rejects archiving the last active wallet', async () => {
    prismaMock.personalWallet.count.mockImplementation(
      async ({ where }: { where?: { isArchived?: boolean } }) =>
        where?.isArchived === false ? 1 : 1,
    );
    prismaMock.personalCategory.count.mockResolvedValue(1);
    prismaMock.personalWallet.findFirst.mockResolvedValue({
      id: 'wal_1',
      workspaceId: 'ws_1',
      name: 'Naqd',
      kind: PersonalWalletKind.CASH,
      openingBalanceSom: 0n,
      sortOrder: 0,
      isArchived: false,
    });

    await expect(updatePersonalWallet('ws_1', 'wal_1', { isArchived: true })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(prismaMock.personalWallet.update).not.toHaveBeenCalled();
  });

  it('archives a wallet when another active one remains', async () => {
    prismaMock.personalWallet.count.mockImplementation(
      async ({ where }: { where?: { isArchived?: boolean } }) =>
        where?.isArchived === false ? 2 : 2,
    );
    prismaMock.personalCategory.count.mockResolvedValue(1);
    prismaMock.personalWallet.findFirst.mockResolvedValue({
      id: 'wal_1',
      workspaceId: 'ws_1',
      name: 'Naqd',
      kind: PersonalWalletKind.CASH,
      openingBalanceSom: 0n,
      sortOrder: 0,
      isArchived: false,
    });
    prismaMock.personalWallet.update.mockResolvedValue({
      id: 'wal_1',
      name: 'Naqd',
      kind: PersonalWalletKind.CASH,
      openingBalanceSom: 0n,
      sortOrder: 0,
      isArchived: true,
    });

    const row = await updatePersonalWallet('ws_1', 'wal_1', { isArchived: true });
    expect(row.isArchived).toBe(true);
  });
});

describe('updatePersonalCategory hide', () => {
  it('rejects hiding the last active category of that kind', async () => {
    prismaMock.personalWallet.count.mockResolvedValue(1);
    prismaMock.personalCategory.count.mockImplementation(
      async ({ where }: { where?: { kind?: string; isActive?: boolean } }) =>
        where?.kind === PersonalCategoryKind.EXPENSE && where?.isActive === true ? 1 : 3,
    );
    prismaMock.personalCategory.findFirst.mockResolvedValue({
      id: 'cat_1',
      workspaceId: 'ws_1',
      kind: PersonalCategoryKind.EXPENSE,
      key: 'FOOD',
      name: 'Oziq-ovqat',
      color: 'teal',
      sortOrder: 0,
      isActive: true,
    });

    await expect(updatePersonalCategory('ws_1', 'cat_1', { isActive: false })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(prismaMock.personalCategory.update).not.toHaveBeenCalled();
  });
});

describe('cancelPersonalTransfer', () => {
  it('marks an active transfer cancelled', async () => {
    prismaMock.personalWallet.count.mockResolvedValue(1);
    prismaMock.personalCategory.count.mockResolvedValue(1);
    prismaMock.personalTransfer.findFirst.mockResolvedValue({
      id: 'tr_1',
      amount: 3_000n,
      occurredAt: new Date('2026-09-13T12:00:00.000Z'),
      note: null,
      status: ExpenseStatus.ACTIVE,
      createdAt: new Date('2026-09-13T12:00:00.000Z'),
      fromWallet: { id: 'wal_1', name: 'Naqd', kind: PersonalWalletKind.CASH },
      toWallet: { id: 'wal_2', name: 'Karta', kind: PersonalWalletKind.CARD },
    });
    prismaMock.personalTransfer.update.mockResolvedValue({
      id: 'tr_1',
      amount: 3_000n,
      occurredAt: new Date('2026-09-13T12:00:00.000Z'),
      note: null,
      status: ExpenseStatus.CANCELLED,
      createdAt: new Date('2026-09-13T12:00:00.000Z'),
      fromWallet: { id: 'wal_1', name: 'Naqd', kind: PersonalWalletKind.CASH },
      toWallet: { id: 'wal_2', name: 'Karta', kind: PersonalWalletKind.CARD },
    });

    const row = await cancelPersonalTransfer('ws_1', 'idn_1', 'tr_1');
    expect(row.status).toBe(ExpenseStatus.CANCELLED);
    expect(prismaMock.personalTransfer.update.mock.calls[0][0].data.status).toBe(
      ExpenseStatus.CANCELLED,
    );
  });
});

describe('listPersonalHistory', () => {
  it('keeps transfers out of expense totals and matches search on category', async () => {
    prismaMock.personalWallet.count.mockResolvedValue(1);
    prismaMock.personalCategory.count.mockResolvedValue(1);
    prismaMock.personalEntry.findMany.mockResolvedValue([
      {
        id: 'ent_1',
        type: PersonalEntryType.EXPENSE,
        amount: 5_000n,
        occurredAt: new Date('2026-09-13T12:00:00.000Z'),
        note: null,
        status: ExpenseStatus.ACTIVE,
        createdAt: new Date('2026-09-13T12:00:00.000Z'),
        wallet: { id: 'wal_1', name: 'Naqd', kind: PersonalWalletKind.CASH },
        category: {
          id: 'cat_1',
          name: 'Oziq-ovqat',
          color: 'teal',
          kind: PersonalCategoryKind.EXPENSE,
        },
      },
    ]);
    prismaMock.personalTransfer.findMany.mockResolvedValue([
      {
        id: 'tr_1',
        amount: 2_000n,
        occurredAt: new Date('2026-09-13T13:00:00.000Z'),
        note: null,
        status: ExpenseStatus.ACTIVE,
        createdAt: new Date('2026-09-13T13:00:00.000Z'),
        fromWallet: { id: 'wal_1', name: 'Naqd', kind: PersonalWalletKind.CASH },
        toWallet: { id: 'wal_2', name: 'Karta', kind: PersonalWalletKind.CARD },
      },
    ]);

    const history = await listPersonalHistory('ws_1', { q: 'oziq' });
    expect(history.totals.expenseSom).toBe(5_000);
    expect(history.totals.transferSom).toBe(2_000);
    expect(history.totals.netSom).toBe(-5_000);
    expect(history.items[0]?.kind).toBe('TRANSFER');
    expect(history.items[1]?.kind).toBe('ENTRY');
    expect(prismaMock.personalEntry.findMany.mock.calls[0][0].where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: { name: { contains: 'oziq', mode: 'insensitive' } } }),
      ]),
    );
  });

  it('omits transfers when filtering by category', async () => {
    prismaMock.personalWallet.count.mockResolvedValue(1);
    prismaMock.personalCategory.count.mockResolvedValue(1);
    prismaMock.personalEntry.findMany.mockResolvedValue([]);

    await listPersonalHistory('ws_1', { categoryId: 'cat_1' });
    expect(prismaMock.personalTransfer.findMany).not.toHaveBeenCalled();
  });
});
