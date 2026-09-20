import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GrowthHabitFrequency, GrowthHabitProgressPeriod, WorkspaceType } from '@furniture-erp/shared';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    personalProfile: { findUnique: vi.fn() },
    growthHabit: { findMany: vi.fn(), findFirst: vi.fn() },
    growthHabitCheckIn: { findMany: vi.fn() },
    growthHabitLog: { findMany: vi.fn() },
    growthHabitConfigVersion: { findMany: vi.fn() },
  },
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { getHabitStatistics, getHabitsProgress } = await import(
  './personal-growth-habit-stats.service.js'
);

const NOW = new Date('2026-09-17T12:00:00.000Z');
const HABIT = {
  id: 'habit_1',
  workspaceId: 'ws_1',
  title: 'Read',
  description: null,
  category: null,
  kind: 'GOOD',
  badMode: null,
  icon: null,
  color: null,
  frequency: GrowthHabitFrequency.DAILY,
  scheduleKind: 'EVERY_DAY',
  intervalDays: null,
  weekdays: [] as number[],
  startDayKey: '2026-09-01',
  endDayKey: null,
  timeOfDay: 'ANY',
  reminderEnabled: false,
  reminderTime: null,
  targetValue: 1,
  targetUnit: 'count',
  goalPeriod: 'DAY',
  notes: null,
  stackAfterHabitId: null,
  stackCue: null,
  remindMinutesBefore: null,
  linkedGoalId: null,
  isArchived: false,
  sortOrder: 0,
  currentStreak: 3,
  bestStreak: 5,
  createdAt: NOW,
  updatedAt: NOW,
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
  prismaMock.personalProfile.findUnique.mockResolvedValue({ timezone: 'Asia/Tashkent' });
  prismaMock.growthHabit.findFirst.mockResolvedValue(HABIT);
  prismaMock.growthHabit.findMany.mockResolvedValue([HABIT]);
  prismaMock.growthHabitConfigVersion.findMany.mockResolvedValue([]);
  prismaMock.growthHabitLog.findMany.mockResolvedValue([]);
  prismaMock.growthHabitCheckIn.findMany.mockResolvedValue([
    { habitId: 'habit_1', dayKey: '2026-09-16', value: 1, skipped: false },
    { habitId: 'habit_1', dayKey: '2026-09-17', value: 1, skipped: false },
  ]);
});

describe('habit statistics', () => {
  it('returns per-habit KPI without loading unrelated workspaces', async () => {
    const stats = await getHabitStatistics('ws_1', 'habit_1', {}, prismaMock as never, NOW);
    expect(stats.habitId).toBe('habit_1');
    expect(stats.kpi.totalValue).toBeGreaterThan(0);
    expect(prismaMock.growthHabit.findFirst).toHaveBeenCalledWith({
      where: { id: 'habit_1', workspaceId: 'ws_1' },
    });
  });

  it('returns 404 when the habit is not in the workspace', async () => {
    prismaMock.growthHabit.findFirst.mockResolvedValue(null);
    await expect(
      getHabitStatistics('ws_1', 'habit_other', {}, prismaMock as never, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('taraqqiyot progress', () => {
  it('includes overall KPI, calendar and analytics', async () => {
    const progress = await getHabitsProgress(
      'ws_1',
      { period: GrowthHabitProgressPeriod.WEEK },
      prismaMock as never,
      NOW,
    );
    expect(progress.period).toBe('WEEK');
    expect(progress.overall).toBeDefined();
    expect(progress.calendar.length).toBeGreaterThan(0);
    expect(progress.analytics.monthOverMonth).toBeDefined();
    expect(progress.analytics.monthOverMonth.currentScheduled).toBeGreaterThanOrEqual(0);
    expect(progress.habits[0]?.title).toBe('Read');
  });

  it('keeps archived habits in historical taraqqiyot', async () => {
    prismaMock.growthHabit.findMany.mockResolvedValue([{ ...HABIT, isArchived: true }]);
    const progress = await getHabitsProgress('ws_1', {}, prismaMock as never, NOW);
    expect(progress.habits).toHaveLength(1);
    expect(prismaMock.growthHabit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: 'ws_1' },
      }),
    );
  });
});
