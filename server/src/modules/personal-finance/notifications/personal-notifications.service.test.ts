import { BudgetWarningLevel, WorkspaceType } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  recordAuditMock,
  listPersonalBudgets,
  listPersonalSavingGoals,
  listPersonalRecurringRules,
  listPersonalDebts,
} = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    personalProfile: { upsert: vi.fn(), update: vi.fn() },
  },
  recordAuditMock: vi.fn(),
  listPersonalBudgets: vi.fn(),
  listPersonalSavingGoals: vi.fn(),
  listPersonalRecurringRules: vi.fn(),
  listPersonalDebts: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('../planning/personal-planning.service.js', () => ({
  listPersonalBudgets,
  listPersonalSavingGoals,
}));
vi.mock('../recurring/personal-recurring.service.js', () => ({ listPersonalRecurringRules }));
vi.mock('../debts/personal-debts.service.js', () => ({ listPersonalDebts }));

const { listPersonalNotifications } = await import('./personal-notifications.service.js');

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
  listPersonalBudgets.mockResolvedValue([]);
  listPersonalSavingGoals.mockResolvedValue([]);
  listPersonalRecurringRules.mockResolvedValue({ items: [], upcoming: [] });
  listPersonalDebts.mockResolvedValue({ items: [], lentOutstandingSom: 0, borrowedOutstandingSom: 0 });
});

describe('listPersonalNotifications', () => {
  it('includes a budget warning when prefs allow it', async () => {
    prismaMock.personalProfile.upsert.mockResolvedValue({
      notifyBudget: true,
      notifyGoals: true,
      notifyRecurring: true,
      notifyDebts: true,
    });
    listPersonalBudgets.mockResolvedValue([
      {
        id: 'bud_1',
        name: 'Oy',
        isActive: true,
        warningLevel: BudgetWarningLevel.OVER,
        overspentSom: 1_000,
        spentSom: 7_000,
      },
    ]);

    const result = await listPersonalNotifications('ws_1', prismaMock as never);
    expect(result.items.some((item) => item.kind === 'BUDGET_OVER' && item.title === 'Oy')).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/storeId/);
  });

  it('hides budget alerts when the preference is off', async () => {
    prismaMock.personalProfile.upsert.mockResolvedValue({
      notifyBudget: false,
      notifyGoals: true,
      notifyRecurring: true,
      notifyDebts: true,
    });
    listPersonalBudgets.mockResolvedValue([
      {
        id: 'bud_1',
        name: 'Oy',
        isActive: true,
        warningLevel: BudgetWarningLevel.OVER,
        overspentSom: 1_000,
        spentSom: 7_000,
      },
    ]);
    const result = await listPersonalNotifications('ws_1', prismaMock as never);
    expect(result.items).toEqual([]);
    expect(listPersonalBudgets).not.toHaveBeenCalled();
  });
});
