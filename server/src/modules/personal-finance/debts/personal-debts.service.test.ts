import { PersonalDebtDirection, WorkspaceType } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    personalDebt: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    personalDebtPayment: { create: vi.fn() },
    sale: { findMany: vi.fn() },
    installmentPlan: { findMany: vi.fn() },
    expense: { findMany: vi.fn() },
  },
  recordAuditMock: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));

const { listPersonalDebts } = await import('./personal-debts.service.js');

const NOW = new Date('2026-09-13T12:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
});

describe('listPersonalDebts', () => {
  it('derives remaining and overdue from personal payments, not store sales', async () => {
    prismaMock.personalDebt.findMany.mockResolvedValue([
      {
        id: 'debt_1',
        direction: PersonalDebtDirection.LENT,
        personName: 'Ali',
        principalSom: 10_000n,
        occurredAt: new Date('2026-09-01T00:00:00.000Z'),
        dueAt: new Date('2026-09-10T00:00:00.000Z'),
        note: null,
        isArchived: false,
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
        payments: [
          {
            id: 'pay_1',
            amountSom: 4_000n,
            occurredAt: new Date('2026-09-05T00:00:00.000Z'),
            note: null,
            createdAt: new Date('2026-09-05T00:00:00.000Z'),
          },
        ],
      },
    ]);

    const result = await listPersonalDebts('ws_1', prismaMock as never, NOW);
    expect(result.items[0]?.paidSom).toBe(4_000);
    expect(result.items[0]?.remainingSom).toBe(6_000);
    expect(result.items[0]?.status).toBe('OVERDUE');
    expect(result.lentOutstandingSom).toBe(6_000);
    expect(result.borrowedOutstandingSom).toBe(0);
    expect(prismaMock.sale.findMany).not.toHaveBeenCalled();
    expect(prismaMock.installmentPlan.findMany).not.toHaveBeenCalled();
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/storeId/);
  });
});
