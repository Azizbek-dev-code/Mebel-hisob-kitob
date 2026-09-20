import {
  GrowthLearningCategory,
  GrowthLearningGoalStatus,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    growthLearningGoal: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    growthLearningMilestone: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    growthLearningSession: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    expense: { findMany: vi.fn() },
    sale: { findMany: vi.fn() },
  },
  recordAuditMock: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('./personal-growth-premium.service.js', () => ({
  assertGrowthQuota: vi.fn().mockResolvedValue('FREE'),
}));

const { createLearningGoal, logLearningSession } = await import(
  './personal-growth-learning.service.js'
);

const NOW = new Date('2026-09-17T12:00:00.000Z');
const GOAL = {
  id: 'lg_1',
  workspaceId: 'ws_1',
  title: 'IELTS 7.0',
  description: null,
  category: GrowthLearningCategory.IELTS,
  status: GrowthLearningGoalStatus.ACTIVE,
  targetValue: 7,
  targetUnit: 'score',
  currentValue: 5.5,
  deadline: new Date('2027-01-01T00:00:00.000Z'),
  totalStudyMinutes: 120,
  sortOrder: 0,
  createdAt: NOW,
  updatedAt: NOW,
  milestones: [
    {
      id: 'ms_1',
      workspaceId: 'ws_1',
      goalId: 'lg_1',
      title: 'Mock 6.0',
      targetValue: 6,
      isReached: false,
      reachedAt: null,
      sortOrder: 0,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
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
  prismaMock.growthLearningGoal.count.mockResolvedValue(0);
  prismaMock.growthLearningSession.findMany.mockResolvedValue([]);
  prismaMock.growthLearningMilestone.findMany.mockResolvedValue([]);
});

describe('createLearningGoal', () => {
  it('creates an IELTS goal with milestones without ERP', async () => {
    prismaMock.growthLearningGoal.create.mockResolvedValue(GOAL);
    const goal = await createLearningGoal(
      'ws_1',
      'idn_1',
      {
        title: 'IELTS 7.0',
        category: GrowthLearningCategory.IELTS,
        targetValue: 7,
        currentValue: 5.5,
        milestones: [{ title: 'Mock 6.0', targetValue: 6 }],
      },
      prismaMock as never,
    );
    expect(goal.progressPercent).toBe(79);
    expect(goal.milestones).toHaveLength(1);
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled();
    expect(prismaMock.sale.findMany).not.toHaveBeenCalled();
  });

  it('stores daily minutes, start date and duration deadline', async () => {
    prismaMock.growthLearningGoal.create.mockResolvedValue({
      ...GOAL,
      title: 'IELTS speaking',
      targetValue: 840,
      targetUnit: 'minutes',
      currentValue: 0,
      dailyMinutes: 30,
      startDate: NOW,
      deadline: new Date('2026-10-15T12:00:00.000Z'),
      linkedTodoIds: '["todo_1"]',
    });
    const goal = await createLearningGoal(
      'ws_1',
      'idn_1',
      {
        title: 'IELTS speaking',
        category: GrowthLearningCategory.IELTS,
        targetValue: 840,
        targetUnit: 'minutes',
        startDate: NOW.toISOString(),
        dailyMinutes: 30,
        durationAmount: 4,
        durationUnit: 'week',
        linkedTodoIds: ['todo_1'],
      },
      prismaMock as never,
    );
    expect(goal.dailyMinutes).toBe(30);
    expect(goal.linkedTodoIds).toEqual(['todo_1']);
    expect(prismaMock.growthLearningGoal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dailyMinutes: 30,
          linkedTodoIds: '["todo_1"]',
        }),
      }),
    );
  });
});

describe('logLearningSession', () => {
  it('credits study minutes onto the goal', async () => {
    prismaMock.growthLearningGoal.findFirst.mockResolvedValue(GOAL);
    prismaMock.growthLearningSession.create.mockResolvedValue({
      id: 'ls_1',
      workspaceId: 'ws_1',
      identityId: 'idn_1',
      goalId: 'lg_1',
      status: 'COMPLETED',
      plannedMinutes: 45,
      startedAt: new Date('2026-09-17T11:15:00.000Z'),
      endedAt: NOW,
      durationSeconds: 45 * 60,
      creditedMinutes: 45,
      clientReportedSeconds: null,
      note: null,
      discardReason: null,
      createdAt: NOW,
      updatedAt: NOW,
      goal: { id: 'lg_1', title: 'IELTS 7.0' },
    });
    prismaMock.growthLearningGoal.update.mockResolvedValue({
      ...GOAL,
      totalStudyMinutes: 165,
    });
    prismaMock.growthLearningGoal.findFirstOrThrow.mockResolvedValue({
      ...GOAL,
      totalStudyMinutes: 165,
    });

    const result = await logLearningSession(
      'ws_1',
      'idn_1',
      { goalId: 'lg_1', minutes: 45 },
      prismaMock as never,
      NOW,
    );
    expect(result.session.creditedMinutes).toBe(45);
    expect(result.goal?.totalStudyMinutes).toBe(165);
    expect(prismaMock.growthLearningGoal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { totalStudyMinutes: { increment: 45 } },
      }),
    );
  });
});
