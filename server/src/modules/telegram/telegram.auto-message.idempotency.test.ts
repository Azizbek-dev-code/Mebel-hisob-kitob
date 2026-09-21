import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executionCreate } = vi.hoisted(() => ({
  executionCreate: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    telegramAutoMessage: {},
    telegramAutoMessageExecution: { create: executionCreate, updateMany: vi.fn() },
    telegramAutomation: {},
    telegramConnection: {},
    workspace: { findUnique: vi.fn() },
  },
}));
vi.mock('../../services/audit.service.js', () => ({ recordAudit: vi.fn() }));
vi.mock('../personal-finance/ledger/personal-ledger.service.js', () => ({
  getPersonalSummary: vi.fn(),
}));
vi.mock('../personal-finance/planning/personal-planning.service.js', () => ({
  listPersonalBudgets: vi.fn(),
  listPersonalSavingGoals: vi.fn(),
}));
vi.mock('../personal-finance/growth/personal-growth-focus.service.js', () => ({
  getFocusStats: vi.fn(),
}));
vi.mock('../../services/customer-catalogue.service.js', () => ({
  getStoreDebtSummary: vi.fn(),
}));
vi.mock('../../repositories/inventory.repository.js', () => ({
  summarizeInventory: vi.fn(),
}));

const { claimAutoMessageExecution } = await import('./telegram.auto-message.service.js');

describe('auto message idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('claims once; second concurrent claim loses on unique constraint', async () => {
    executionCreate.mockResolvedValueOnce({ id: 'ex1' }).mockRejectedValueOnce({ code: 'P2002' });

    const first = await claimAutoMessageExecution({
      autoMessageId: 'am1',
      identityId: 'idn1',
      accountId: 'ws1',
      periodKey: '2026-03-21',
    });
    const second = await claimAutoMessageExecution({
      autoMessageId: 'am1',
      identityId: 'idn1',
      accountId: 'ws1',
      periodKey: '2026-03-21',
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(executionCreate).toHaveBeenCalledTimes(2);
  });
});
