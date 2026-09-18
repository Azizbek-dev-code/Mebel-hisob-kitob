import { GrowthHabitFrequency, WorkspaceType } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    growthHabit: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    growthHabitCheckIn: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    growthDailyGoal: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    growthTodo: { findMany: vi.fn() },
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

const {
  checkInGrowthHabit,
  createGrowthHabit,
  getTodayProgress,
  upsertDailyGoals,
} = await import('./personal-growth-habits.service.js');

const NOW = new Date('2026-09-17T12:00:00.000Z');
const HABIT = {
  id: 'habit_1',
  workspaceId: 'ws_1',
  title: '20 English words',
  description: null,
  category: 'Language',
  frequency: GrowthHabitFrequency.DAILY,
  intervalDays: null,
  targetValue: 20,
  targetUnit: 'words',
  remindMinutesBefore: null,
  linkedGoalId: null,
  isArchived: false,
  sortOrder: 0,
  currentStreak: 0,
  bestStreak: 0,
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
  prismaMock.growthHabit.count.mockResolvedValue(0);
  prismaMock.growthHabitCheckIn.findMany.mockResolvedValue([]);
  prismaMock.growthHabitCheckIn.findFirst.mockResolvedValue(null);
  prismaMock.growthTodo.findMany.mockResolvedValue([]);
  prismaMock.growthDailyGoal.findMany.mockResolvedValue([]);
});

describe('createGrowthHabit', () => {
  it('creates a daily habit without touching ERP tables', async () => {
    prismaMock.growthHabit.create.mockResolvedValue(HABIT);
    const habit = await createGrowthHabit(
      'ws_1',
      'idn_1',
      { title: '20 English words', targetValue: 20, targetUnit: 'words' },
      prismaMock as never,
    );
    expect(habit.title).toBe('20 English words');
    expect(habit.dueToday).toBe(true);
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled();
    expect(prismaMock.sale.findMany).not.toHaveBeenCalled();
  });
});

describe('checkInGrowthHabit', () => {
  it('upserts today check-in and updates streak', async () => {
    prismaMock.growthHabit.findFirst.mockResolvedValue(HABIT);
    prismaMock.growthHabitCheckIn.upsert.mockResolvedValue({
      id: 'ci_1',
      workspaceId: 'ws_1',
      habitId: 'habit_1',
      dayKey: '2026-09-17',
      value: 20,
      note: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    prismaMock.growthHabitCheckIn.findMany.mockResolvedValue([
      { dayKey: '2026-09-16', value: 20 },
      { dayKey: '2026-09-17', value: 20 },
    ]);
    prismaMock.growthHabit.update.mockResolvedValue({
      ...HABIT,
      currentStreak: 2,
      bestStreak: 2,
    });
    prismaMock.growthHabitCheckIn.findFirst.mockResolvedValue({
      id: 'ci_1',
      workspaceId: 'ws_1',
      habitId: 'habit_1',
      dayKey: '2026-09-17',
      value: 20,
      note: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    const habit = await checkInGrowthHabit(
      'ws_1',
      'habit_1',
      { value: 20 },
      'idn_1',
      prismaMock as never,
      NOW,
    );
    expect(habit.currentStreak).toBe(2);
    expect(habit.todayCheckIn?.value).toBe(20);
    expect(habit.dueToday).toBe(false);
  });
});

describe('upsertDailyGoals', () => {
  it('enforces max 3 daily goals', async () => {
    await expect(
      upsertDailyGoals(
        'ws_1',
        {
          items: [
            { title: 'A' },
            { title: 'B' },
            { title: 'C' },
            { title: 'D' },
          ],
        },
        prismaMock as never,
        NOW,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('creates up to 3 goals for the day', async () => {
    prismaMock.growthDailyGoal.create
      .mockResolvedValueOnce({
        id: 'g1',
        workspaceId: 'ws_1',
        dayKey: '2026-09-17',
        title: 'IELTS — 1h',
        estimatedMinutes: 60,
        isDone: false,
        sortOrder: 0,
        completedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      })
      .mockResolvedValueOnce({
        id: 'g2',
        workspaceId: 'ws_1',
        dayKey: '2026-09-17',
        title: 'React — 1h',
        estimatedMinutes: 60,
        isDone: false,
        sortOrder: 1,
        completedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      });

    const result = await upsertDailyGoals(
      'ws_1',
      {
        items: [
          { title: 'IELTS — 1h', estimatedMinutes: 60 },
          { title: 'React — 1h', estimatedMinutes: 60 },
        ],
      },
      prismaMock as never,
      NOW,
    );
    expect(result.totalCount).toBe(2);
    expect(result.doneCount).toBe(0);
  });
});

describe('getTodayProgress', () => {
  it('returns percent from habits + daily goals + focus todos', async () => {
    prismaMock.growthHabit.findMany.mockResolvedValue([HABIT]);
    prismaMock.growthHabitCheckIn.findMany.mockResolvedValue([
      {
        id: 'ci_1',
        workspaceId: 'ws_1',
        habitId: 'habit_1',
        dayKey: '2026-09-17',
        value: 20,
        note: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);
    prismaMock.growthDailyGoal.findMany.mockResolvedValue([
      {
        id: 'g1',
        workspaceId: 'ws_1',
        dayKey: '2026-09-17',
        title: 'Kitob',
        estimatedMinutes: 30,
        isDone: true,
        sortOrder: 0,
        completedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);
    prismaMock.growthTodo.findMany.mockResolvedValue([
      { status: 'DONE' },
      { status: 'TODO' },
    ]);

    const progress = await getTodayProgress('ws_1', prismaMock as never, NOW);
    expect(progress.habitsDone).toBe(1);
    expect(progress.dailyGoalsDone).toBe(1);
    expect(progress.focusTodosDone).toBe(1);
    expect(progress.focusTodosTotal).toBe(2);
    expect(progress.percent).toBeGreaterThan(0);
  });
});
