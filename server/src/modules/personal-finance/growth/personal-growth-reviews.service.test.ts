import { WorkspaceType } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    growthWeeklyReview: { findUnique: vi.fn(), upsert: vi.fn() },
    growthMonthlyReport: { findUnique: vi.fn(), upsert: vi.fn() },
    growthFocusSession: { findMany: vi.fn() },
    growthLearningSession: { findMany: vi.fn() },
    growthTodo: { count: vi.fn() },
    growthHabitCheckIn: { count: vi.fn() },
    growthDailyGoal: { count: vi.fn() },
    growthXpEvent: { aggregate: vi.fn() },
    growthProgress: { findUnique: vi.fn() },
    personalEntry: { aggregate: vi.fn() },
  },
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { getWeeklyReview, upsertWeeklyReview } = await import(
  './personal-growth-reviews.service.js'
);

const NOW = new Date('2026-09-17T12:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
  prismaMock.growthFocusSession.findMany.mockResolvedValue([{ creditedMinutes: 50 }]);
  prismaMock.growthLearningSession.findMany.mockResolvedValue([{ creditedMinutes: 40 }]);
  prismaMock.growthTodo.count.mockResolvedValue(8);
  prismaMock.growthHabitCheckIn.count.mockResolvedValue(5);
  prismaMock.growthDailyGoal.count.mockResolvedValue(3);
  prismaMock.growthXpEvent.aggregate
    .mockResolvedValueOnce({ _sum: { amount: 200 } })
    .mockResolvedValueOnce({ _sum: { amount: 800 } });
  prismaMock.growthProgress.findUnique.mockResolvedValue({
    currentStreak: 4,
    bestStreak: 10,
    totalXp: 1000,
    level: 5,
  });
  prismaMock.personalEntry.aggregate
    .mockResolvedValueOnce({ _sum: { amount: 150000n } })
    .mockResolvedValueOnce({ _sum: { amount: 47000n } });
  prismaMock.growthWeeklyReview.findUnique.mockResolvedValue(null);
});

describe('getWeeklyReview', () => {
  it('returns live metrics for the ISO week', async () => {
    const review = await getWeeklyReview(
      'ws_1',
      'idn_1',
      '2026-09-17',
      prismaMock as never,
      NOW,
    );
    expect(review.weekStartDayKey).toBe('2026-09-14');
    expect(review.weekEndDayKey).toBe('2026-09-20');
    expect(review.metrics.focusMinutes).toBe(50);
    expect(review.metrics.studyMinutes).toBe(40);
    expect(review.metrics.tasksCompleted).toBe(8);
    expect(review.metrics.xpEarned).toBe(200);
    expect(review.metrics.finance.netSom).toBe(103000);
    expect(review.reflection.wentWell).toBeNull();
  });
});

describe('upsertWeeklyReview', () => {
  it('persists reflection answers', async () => {
    prismaMock.growthWeeklyReview.upsert.mockResolvedValue({});
    prismaMock.growthXpEvent.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 200 } })
      .mockResolvedValueOnce({ _sum: { amount: 800 } });
    prismaMock.personalEntry.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 0n } })
      .mockResolvedValueOnce({ _sum: { amount: 0n } });
    prismaMock.growthWeeklyReview.findUnique.mockResolvedValue({
      wentWell: 'Fokus yaxshi',
      wasHard: 'Kechqurun',
      nextWeekChange: 'Erta turish',
      updatedAt: NOW,
    });

    const review = await upsertWeeklyReview(
      'ws_1',
      'idn_1',
      {
        weekStartDayKey: '2026-09-14',
        wentWell: 'Fokus yaxshi',
        wasHard: 'Kechqurun',
        nextWeekChange: 'Erta turish',
      },
      prismaMock as never,
      NOW,
    );

    expect(prismaMock.growthWeeklyReview.upsert).toHaveBeenCalled();
    expect(review.reflection.wentWell).toBe('Fokus yaxshi');
  });
});
