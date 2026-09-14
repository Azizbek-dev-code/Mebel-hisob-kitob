import {
  ExpenseStatus,
  PersonalCategoryKind,
  PersonalEntryType,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, ensurePersonalLedger } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    personalEntry: { findMany: vi.fn() },
    personalTransfer: { findMany: vi.fn() },
    expense: { findMany: vi.fn(), groupBy: vi.fn() },
  },
  ensurePersonalLedger: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../ledger/personal-ledger.service.js', () => ({ ensurePersonalLedger }));

const { getPersonalAnalytics } = await import('./personal-analytics.service.js');

const NOW = new Date('2026-09-13T12:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  ensurePersonalLedger.mockResolvedValue(undefined);
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
});

describe('getPersonalAnalytics', () => {
  it('totals the selected window, not only the current month', async () => {
    prismaMock.personalEntry.findMany.mockResolvedValue([
      {
        type: PersonalEntryType.INCOME,
        amount: 100_000n,
        occurredAt: new Date('2026-09-05T12:00:00.000Z'),
        categoryId: 'cat_in',
        category: { id: 'cat_in', name: 'Ish haqi', kind: PersonalCategoryKind.INCOME },
      },
      {
        type: PersonalEntryType.EXPENSE,
        amount: 40_000n,
        occurredAt: new Date('2026-09-08T12:00:00.000Z'),
        categoryId: 'cat_food',
        category: { id: 'cat_food', name: 'Oziq-ovqat', kind: PersonalCategoryKind.EXPENSE },
      },
      {
        type: PersonalEntryType.EXPENSE,
        amount: 10_000n,
        occurredAt: new Date('2026-08-20T12:00:00.000Z'),
        categoryId: 'cat_food',
        category: { id: 'cat_food', name: 'Oziq-ovqat', kind: PersonalCategoryKind.EXPENSE },
      },
    ]);

    const three = await getPersonalAnalytics('ws_1', 3, prismaMock as never, NOW);
    expect(three.incomeSom).toBe(100_000);
    expect(three.expenseSom).toBe(50_000);
    expect(three.netSom).toBe(50_000);
    expect(three.savingsRatePercent).toBe(50);
    expect(three.byCategory.find((row) => row.name === 'Oziq-ovqat')?.amountSom).toBe(50_000);
    expect(three.monthly).toHaveLength(3);
    expect(three.monthly[2]?.yearMonth).toBe('2026-09');
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled();
    expect(prismaMock.personalTransfer.findMany).not.toHaveBeenCalled();
    expect(JSON.stringify(three)).not.toMatch(/storeId/);

    const one = await getPersonalAnalytics('ws_1', 1, prismaMock as never, NOW);
    expect(one.incomeSom).toBe(100_000);
    expect(one.expenseSom).toBe(40_000);
    expect(one.previous.expenseSom).toBe(10_000);
    expect(one.byCategory.find((row) => row.name === 'Oziq-ovqat')?.amountSom).toBe(40_000);

    const year = await getPersonalAnalytics('ws_1', 12, prismaMock as never, NOW);
    expect(year.monthly).toHaveLength(12);
    expect(year.monthly[0]?.yearMonth).toBe('2025-10');
    expect(year.monthly[11]?.yearMonth).toBe('2026-09');
  });

  it('queries only ACTIVE income and expense rows', async () => {
    prismaMock.personalEntry.findMany.mockResolvedValue([]);
    await getPersonalAnalytics('ws_1', 1, prismaMock as never, NOW);
    expect(prismaMock.personalEntry.findMany.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        workspaceId: 'ws_1',
        status: ExpenseStatus.ACTIVE,
        type: { in: [PersonalEntryType.INCOME, PersonalEntryType.EXPENSE] },
      }),
    );
  });
});
