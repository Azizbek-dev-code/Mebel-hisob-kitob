import { GrowthXpSource, WorkspaceType } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    growthProgress: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    growthXpEvent: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
  },
  recordAuditMock: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('../../../utils/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { awardXp, getGrowthProgress } = await import('./personal-growth-xp.service.js');

const NOW = new Date('2026-09-17T12:00:00.000Z');
const PROGRESS = {
  id: 'gp_1',
  workspaceId: 'ws_1',
  identityId: 'idn_1',
  totalXp: 90,
  level: 1,
  currentStreak: 2,
  bestStreak: 4,
  lastActivityDayKey: '2026-09-16',
  createdAt: NOW,
  updatedAt: NOW,
};

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
  prismaMock.growthXpEvent.findUnique.mockResolvedValue(null);
  prismaMock.growthXpEvent.aggregate.mockResolvedValue({ _sum: { amount: 40 } });
  prismaMock.growthXpEvent.findMany.mockResolvedValue([]);
  prismaMock.growthProgress.findUnique.mockResolvedValue(PROGRESS);
});

describe('awardXp', () => {
  it('awards todo XP, bumps streak and level', async () => {
    prismaMock.growthXpEvent.create.mockResolvedValue({
      id: 'xe_1',
      workspaceId: 'ws_1',
      identityId: 'idn_1',
      source: GrowthXpSource.TODO_COMPLETED,
      amount: 15,
      sourceEntityId: 'todo_1',
      dayKey: '2026-09-17',
      summary: 'Todo done',
      createdAt: NOW,
    });
    prismaMock.growthProgress.update.mockResolvedValue({
      ...PROGRESS,
      totalXp: 105,
      level: 2,
      currentStreak: 3,
      bestStreak: 4,
      lastActivityDayKey: '2026-09-17',
    });

    const result = await awardXp(
      {
        workspaceId: 'ws_1',
        identityId: 'idn_1',
        source: GrowthXpSource.TODO_COMPLETED,
        sourceEntityId: 'todo_1',
        summary: 'Todo done',
      },
      prismaMock as never,
      NOW,
    );

    expect(result?.awarded).toBe(15);
    expect(result?.progress.level).toBe(2);
    expect(result?.progress.currentStreak).toBe(3);
    expect(prismaMock.growthXpEvent.create).toHaveBeenCalled();
  });

  it('is idempotent for the same source entity', async () => {
    prismaMock.growthXpEvent.findUnique.mockResolvedValue({
      id: 'xe_1',
      amount: 15,
    });
    prismaMock.growthXpEvent.aggregate.mockResolvedValue({ _sum: { amount: 15 } });

    const result = await awardXp(
      {
        workspaceId: 'ws_1',
        identityId: 'idn_1',
        source: GrowthXpSource.TODO_COMPLETED,
        sourceEntityId: 'todo_1',
      },
      prismaMock as never,
      NOW,
    );
    expect(result?.awarded).toBe(0);
    expect(prismaMock.growthXpEvent.create).not.toHaveBeenCalled();
  });
});

describe('getGrowthProgress', () => {
  it('returns level band and today XP', async () => {
    prismaMock.growthXpEvent.aggregate.mockResolvedValue({ _sum: { amount: 55 } });
    const progress = await getGrowthProgress('ws_1', 'idn_1', prismaMock as never, NOW);
    expect(progress.totalXp).toBe(90);
    expect(progress.todayXp).toBe(55);
    expect(progress.level).toBe(1);
  });
});
