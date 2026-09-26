import {
  ExpenseStatus,
  PersonalBudgetKind,
  PersonalCategoryKind,
  PersonalEntryType,
  PersonalSavingGoalStatus,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock, ensurePersonalLedger, tryAwardXpMock, tryEvaluateAchievementsMock } =
  vi.hoisted(() => ({
    prismaMock: {
      workspace: { findUnique: vi.fn() },
      personalBudget: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      personalCategory: { findFirst: vi.fn() },
      personalEntry: { aggregate: vi.fn(), groupBy: vi.fn() },
      personalSavingGoal: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findFirstOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      personalGoalContribution: { create: vi.fn() },
    },
    recordAuditMock: vi.fn(),
    ensurePersonalLedger: vi.fn(),
    tryAwardXpMock: vi.fn(),
    tryEvaluateAchievementsMock: vi.fn(),
  }));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('../ledger/personal-ledger.service.js', () => ({ ensurePersonalLedger }));
vi.mock('../growth/personal-growth-xp.service.js', () => ({ tryAwardXp: tryAwardXpMock }));
vi.mock('../growth/personal-growth-achievements.service.js', () => ({
  tryEvaluateAchievements: tryEvaluateAchievementsMock,
}));

const {
  addPersonalGoalContribution,
  createPersonalBudget,
  createPersonalSavingGoal,
  listPersonalBudgets,
} = await import('./personal-planning.service.js');

const WORKSPACE = {
  id: 'ws_1',
  type: WorkspaceType.PERSONAL,
  status: 'ACTIVE',
  storeId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  ensurePersonalLedger.mockResolvedValue(undefined);
  tryAwardXpMock.mockResolvedValue(undefined);
  tryEvaluateAchievementsMock.mockResolvedValue(undefined);
  prismaMock.workspace.findUnique.mockResolvedValue(WORKSPACE);
  prismaMock.personalEntry.aggregate.mockResolvedValue({ _sum: { amount: 0n } });
  prismaMock.personalEntry.groupBy.mockResolvedValue([]);
});

describe('listPersonalBudgets', () => {
  it('computes month spend from personal entries, not store expenses', async () => {
    prismaMock.personalBudget.findMany.mockResolvedValue([
      {
        id: 'bud_1',
        kind: PersonalBudgetKind.CATEGORY,
        name: 'Oziq-ovqat',
        limitSom: 100_000n,
        isActive: true,
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
        categoryId: 'cat_1',
        category: { id: 'cat_1', name: 'Oziq-ovqat' },
      },
    ]);
    prismaMock.personalEntry.groupBy.mockResolvedValue([
      { categoryId: 'cat_1', _sum: { amount: 40_000n } },
    ]);

    const items = await listPersonalBudgets('ws_1');
    expect(items[0]?.spentSom).toBe(40_000);
    expect(items[0]?.remainingSom).toBe(60_000);
    expect(items[0]?.percent).toBe(40);
    expect(items[0]?.warningLevel).toBe('NONE');
    expect(items[0]?.overspentSom).toBe(0);
    expect(prismaMock.personalEntry.groupBy.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        workspaceId: 'ws_1',
        type: PersonalEntryType.EXPENSE,
        status: ExpenseStatus.ACTIVE,
      }),
    );
    expect(JSON.stringify(items)).not.toMatch(/storeId/);
  });

  it('flags 80% spend as NEAR without counting a transfer', async () => {
    prismaMock.personalBudget.findMany.mockResolvedValue([
      {
        id: 'bud_1',
        kind: PersonalBudgetKind.TOTAL,
        name: 'Oy',
        limitSom: 10_000n,
        isActive: true,
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
        categoryId: null,
        category: null,
      },
    ]);
    prismaMock.personalEntry.groupBy.mockResolvedValue([
      { categoryId: 'cat_x', _sum: { amount: 8_000n } },
    ]);

    const items = await listPersonalBudgets('ws_1');
    expect(items[0]?.warningLevel).toBe('NEAR');
    expect(items[0]?.percent).toBe(80);
    expect(prismaMock.personalEntry.groupBy.mock.calls[0][0].where.type).toBe(PersonalEntryType.EXPENSE);
  });
});

describe('createPersonalBudget', () => {
  it('stores a category limit without storeId', async () => {
    prismaMock.personalCategory.findFirst.mockResolvedValue({
      id: 'cat_1',
      workspaceId: 'ws_1',
      kind: PersonalCategoryKind.EXPENSE,
      isActive: true,
    });
    prismaMock.personalBudget.create.mockResolvedValue({
      id: 'bud_1',
      kind: PersonalBudgetKind.CATEGORY,
      name: 'Oziq-ovqat',
      limitSom: 80_000n,
      isActive: true,
      createdAt: new Date('2026-09-13T00:00:00.000Z'),
      categoryId: 'cat_1',
      category: { id: 'cat_1', name: 'Oziq-ovqat' },
    });

    const budget = await createPersonalBudget('ws_1', 'idn_1', {
      kind: PersonalBudgetKind.CATEGORY,
      name: 'Oziq-ovqat',
      limitSom: 80_000,
      categoryId: 'cat_1',
    });

    expect(prismaMock.personalBudget.create.mock.calls[0][0].data).not.toHaveProperty('storeId');
    expect(budget.limitSom).toBe(80_000);
  });
});

describe('createPersonalSavingGoal', () => {
  it('creates a goal with empty contribution history', async () => {
    prismaMock.personalSavingGoal.create.mockResolvedValue({
      id: 'goal_1',
      name: 'Zaxira',
      targetAmountSom: 500_000n,
      targetDate: null,
      monthlyContributionSom: 20_000n,
      status: PersonalSavingGoalStatus.ACTIVE,
      createdAt: new Date('2026-09-13T00:00:00.000Z'),
      contributions: [],
    });

    const goal = await createPersonalSavingGoal('ws_1', 'idn_1', {
      name: 'Zaxira',
      targetSom: 500_000,
      monthlyContributionSom: 20_000,
    });
    expect(goal.savedSom).toBe(0);
    expect(goal.etaKind).toBe('MONTHLY');
    expect(goal.monthlyContributionSom).toBe(20_000);
    expect(goal.estimatedReachAt).toEqual(expect.any(String));
    expect(goal.contributions).toEqual([]);
    expect(prismaMock.personalSavingGoal.create.mock.calls[0][0].data).not.toHaveProperty('storeId');
    expect(prismaMock.personalSavingGoal.create.mock.calls[0][0].data.monthlyContributionSom).toBe(20_000n);
    expect(tryEvaluateAchievementsMock).toHaveBeenCalledWith('ws_1', 'idn_1');
  });
});

describe('addPersonalGoalContribution', () => {
  it('records history and estimates reach time', async () => {
    prismaMock.personalSavingGoal.findFirst.mockResolvedValue({
      id: 'goal_1',
      name: 'Zaxira',
      targetAmountSom: 10_000n,
      targetDate: null,
      monthlyContributionSom: null,
      status: PersonalSavingGoalStatus.ACTIVE,
      createdAt: new Date('2026-09-03T12:00:00.000Z'),
      contributions: [],
    });
    prismaMock.personalGoalContribution.create.mockResolvedValue({ id: 'con_1' });
    prismaMock.personalSavingGoal.findFirstOrThrow.mockResolvedValue({
      id: 'goal_1',
      name: 'Zaxira',
      targetAmountSom: 10_000n,
      targetDate: null,
      monthlyContributionSom: null,
      status: PersonalSavingGoalStatus.ACTIVE,
      createdAt: new Date('2026-09-03T12:00:00.000Z'),
      contributions: [
        {
          id: 'con_1',
          amountSom: 2_000n,
          occurredAt: new Date('2026-09-03T12:00:00.000Z'),
          note: null,
          createdAt: new Date('2026-09-03T12:00:00.000Z'),
        },
      ],
    });

    const goal = await addPersonalGoalContribution('ws_1', 'goal_1', 'idn_1', {
      amount: 2_000,
      occurredAt: '2026-09-03',
    });

    expect(goal.savedSom).toBe(2_000);
    expect(goal.contributions).toHaveLength(1);
    expect(goal.estimatedReachAt).toBeNull();
    expect(goal.etaKind).toBeNull();
    expect(prismaMock.personalSavingGoal.update).not.toHaveBeenCalled();
    expect(tryAwardXpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'FINANCE_DISCIPLINE',
        sourceEntityId: 'finance-contrib:con_1',
        amount: 15,
        dayKey: '2026-09-03',
      }),
    );
    expect(tryEvaluateAchievementsMock).toHaveBeenCalledWith('ws_1', 'idn_1');
  });
});
