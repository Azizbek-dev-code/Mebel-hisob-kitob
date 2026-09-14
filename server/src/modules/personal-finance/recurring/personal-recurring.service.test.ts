import {
  PersonalEntryType,
  PersonalRecurringFrequency,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock, createPersonalEntry } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    personalRecurringRule: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    personalWallet: { findFirst: vi.fn() },
    personalCategory: { findFirst: vi.fn() },
    personalEntry: { create: vi.fn(), findMany: vi.fn() },
    expense: { findMany: vi.fn() },
    sale: { findMany: vi.fn() },
  },
  recordAuditMock: vi.fn(),
  createPersonalEntry: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('../ledger/personal-ledger.service.js', () => ({ createPersonalEntry }));

const {
  acknowledgePersonalRecurringRule,
  listPersonalRecurringRules,
  logPersonalRecurringRule,
} = await import('./personal-recurring.service.js');

const NOW = new Date('2026-09-13T12:00:00.000Z');
const RULE = {
  id: 'rec_1',
  name: 'Internet',
  type: PersonalEntryType.EXPENSE,
  amountSom: 3_000n,
  frequency: PersonalRecurringFrequency.MONTHLY,
  intervalDays: null,
  dayOfMonth: 5,
  nextDueAt: new Date('2026-10-05T00:00:00.000Z'),
  note: null,
  isActive: true,
  walletId: 'wal_1',
  categoryId: 'cat_1',
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  wallet: { id: 'wal_1', name: 'Naqd' },
  category: { id: 'cat_1', name: 'Kommunal' },
};

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  createPersonalEntry.mockResolvedValue({});
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
});

describe('listPersonalRecurringRules', () => {
  it('surfaces upcoming reminders and never reads store sales or expenses', async () => {
    prismaMock.personalRecurringRule.findMany.mockResolvedValue([RULE]);
    const result = await listPersonalRecurringRules('ws_1', prismaMock as never, NOW);
    expect(result.upcoming).toHaveLength(1);
    expect(result.upcoming[0]?.name).toBe('Internet');
    expect(result.upcoming[0]?.dueState).toBe('DUE');
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled();
    expect(prismaMock.sale.findMany).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/storeId/);
  });
});

describe('acknowledgePersonalRecurringRule', () => {
  it('advances nextDueAt without creating a ledger entry', async () => {
    prismaMock.personalRecurringRule.findFirst.mockResolvedValue(RULE);
    prismaMock.personalRecurringRule.update.mockResolvedValue({
      ...RULE,
      nextDueAt: new Date('2026-11-05T00:00:00.000Z'),
    });
    const rule = await acknowledgePersonalRecurringRule('ws_1', 'idn_1', 'rec_1', prismaMock as never);
    expect(rule.nextDueAt.startsWith('2026-11-05')).toBe(true);
    expect(createPersonalEntry).not.toHaveBeenCalled();
    expect(prismaMock.personalEntry.create).not.toHaveBeenCalled();
  });
});

describe('logPersonalRecurringRule', () => {
  it('records an explicit entry then advances the reminder', async () => {
    prismaMock.personalRecurringRule.findFirst.mockResolvedValue(RULE);
    prismaMock.personalRecurringRule.update.mockResolvedValue({
      ...RULE,
      nextDueAt: new Date('2026-11-05T00:00:00.000Z'),
    });
    await logPersonalRecurringRule('ws_1', 'idn_1', 'rec_1', prismaMock as never);
    expect(createPersonalEntry).toHaveBeenCalledWith(
      'ws_1',
      'idn_1',
      expect.objectContaining({
        type: PersonalEntryType.EXPENSE,
        amount: 3_000,
        walletId: 'wal_1',
        categoryId: 'cat_1',
      }),
      prismaMock,
    );
  });
});
