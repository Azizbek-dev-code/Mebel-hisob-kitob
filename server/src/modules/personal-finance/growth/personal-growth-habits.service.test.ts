import { GrowthHabitFrequency, WorkspaceType } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    personalProfile: { findUnique: vi.fn() },
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
    growthHabitLog: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    growthHabitChecklistItem: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    growthHabitChecklistTick: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    growthHabitConfigVersion: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
  createHabitLog,
  getGrowthHabit,
  getTodayProgress,
  skipHabitDay,
  updateGrowthHabit,
  upsertDailyGoals,
} = await import('./personal-growth-habits.service.js');

const NOW = new Date('2026-09-17T12:00:00.000Z');
const HABIT = {
  id: 'habit_1',
  workspaceId: 'ws_1',
  title: '20 English words',
  description: null,
  category: 'Language',
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
  targetValue: 20,
  targetUnit: 'words',
  goalPeriod: 'DAY',
  notes: null,
  stackAfterHabitId: null,
  stackCue: null,
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
  prismaMock.personalProfile.findUnique.mockResolvedValue({ timezone: 'Asia/Tashkent' });
  prismaMock.growthHabit.count.mockResolvedValue(0);
  prismaMock.growthHabitCheckIn.findMany.mockResolvedValue([]);
  prismaMock.growthHabitCheckIn.findFirst.mockResolvedValue(null);
  prismaMock.growthHabitLog.findMany.mockResolvedValue([]);
  prismaMock.growthHabitLog.findFirst.mockResolvedValue(null);
  prismaMock.growthHabitLog.create.mockResolvedValue({
    id: 'log_1',
    workspaceId: 'ws_1',
    habitId: 'habit_1',
    dayKey: '2026-09-17',
    value: 20,
    note: null,
    loggedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  });
  prismaMock.growthHabitChecklistItem.findMany.mockResolvedValue([]);
  prismaMock.growthHabitChecklistTick.findMany.mockResolvedValue([]);
  prismaMock.growthHabitChecklistTick.count.mockResolvedValue(0);
  prismaMock.growthHabitConfigVersion.findMany.mockResolvedValue([]);
  prismaMock.growthHabitConfigVersion.findFirst.mockResolvedValue(null);
  prismaMock.growthHabitConfigVersion.create.mockResolvedValue({ id: 'cfg_1' });
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
      NOW,
    );
    expect(habit.title).toBe('20 English words');
    expect(habit.dueToday).toBe(true);
    expect(habit.kind).toBe('GOOD');
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled();
    expect(prismaMock.sale.findMany).not.toHaveBeenCalled();
    expect(prismaMock.growthHabitConfigVersion.create).toHaveBeenCalled();
  });

  it('creates a bad limit habit', async () => {
    prismaMock.growthHabit.create.mockResolvedValue({
      ...HABIT,
      title: 'Instagram',
      kind: 'BAD',
      badMode: 'LIMIT',
      targetValue: 60,
      targetUnit: 'duration',
    });
    const habit = await createGrowthHabit(
      'ws_1',
      'idn_1',
      {
        title: 'Instagram',
        kind: 'BAD',
        badMode: 'LIMIT',
        targetValue: 60,
        targetUnit: 'duration',
      },
      prismaMock as never,
      NOW,
    );
    expect(habit.kind).toBe('BAD');
    expect(habit.badMode).toBe('LIMIT');
  });
});

describe('updateGrowthHabit', () => {
  it('archives a habit and keeps it readable', async () => {
    prismaMock.growthHabit.findFirst.mockResolvedValue(HABIT);
    prismaMock.growthHabit.update.mockResolvedValue({ ...HABIT, isArchived: true });
    const habit = await updateGrowthHabit(
      'ws_1',
      'habit_1',
      'idn_1',
      { isArchived: true },
      prismaMock as never,
      NOW,
    );
    expect(habit.isArchived).toBe(true);
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
      status: 'COMPLETED',
      skipped: false,
      goalValueSnapshot: 20,
      goalUnitSnapshot: 'words',
      goalPeriodSnapshot: 'DAY',
      checklistDone: 0,
      checklistTotal: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
    prismaMock.growthHabitCheckIn.findMany.mockResolvedValue([
      { id: 'ci_0', habitId: 'habit_1', dayKey: '2026-09-16', value: 20, skipped: false, createdAt: NOW },
      {
        id: 'ci_1',
        habitId: 'habit_1',
        dayKey: '2026-09-17',
        value: 20,
        skipped: false,
        createdAt: NOW,
        status: 'COMPLETED',
      },
    ]);
    prismaMock.growthHabit.update.mockResolvedValue({
      ...HABIT,
      currentStreak: 2,
      bestStreak: 2,
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
    expect(prismaMock.growthHabitLog.create).toHaveBeenCalled();
  });

  it('rejects one-tap completion for duration habits', async () => {
    prismaMock.growthHabit.findFirst.mockResolvedValue({
      ...HABIT,
      targetValue: 45,
      targetUnit: 'duration',
    });
    prismaMock.growthHabitLog.findMany.mockResolvedValue([{ value: 12 }]);
    await expect(
      checkInGrowthHabit('ws_1', 'habit_1', {}, 'idn_1', prismaMock as never, NOW),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(prismaMock.growthHabitLog.create).not.toHaveBeenCalled();
  });

  it('sums multiple quantitative logs', async () => {
    prismaMock.growthHabit.findFirst.mockResolvedValue({ ...HABIT, targetValue: 30, targetUnit: 'duration' });
    prismaMock.growthHabitLog.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ value: 10 }, { value: 15 }]);
    prismaMock.growthHabitCheckIn.upsert.mockResolvedValue({
      id: 'ci_1',
      workspaceId: 'ws_1',
      habitId: 'habit_1',
      dayKey: '2026-09-17',
      value: 25,
      note: null,
      status: 'PARTIAL',
      skipped: false,
      goalValueSnapshot: 30,
      goalUnitSnapshot: 'duration',
      goalPeriodSnapshot: 'DAY',
      checklistDone: 0,
      checklistTotal: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
    prismaMock.growthHabitCheckIn.findMany.mockResolvedValue([
      {
        id: 'ci_1',
        habitId: 'habit_1',
        dayKey: '2026-09-17',
        value: 25,
        skipped: false,
        createdAt: NOW,
        status: 'PARTIAL',
      },
    ]);
    prismaMock.growthHabit.update.mockResolvedValue({ ...HABIT, targetValue: 30, targetUnit: 'duration' });

    const habit = await createHabitLog(
      'ws_1',
      'habit_1',
      'idn_1',
      { value: 15 },
      prismaMock as never,
      NOW,
    );
    expect(habit.todayStatus).toBe('PARTIAL');
  });

  it('marks 10+10+10 duration as completed', async () => {
    prismaMock.growthHabit.findFirst.mockResolvedValue({ ...HABIT, targetValue: 30, targetUnit: 'duration' });
    prismaMock.growthHabitLog.findMany.mockResolvedValue([{ value: 10 }, { value: 10 }, { value: 10 }]);
    prismaMock.growthHabitCheckIn.upsert.mockResolvedValue({
      id: 'ci_1',
      workspaceId: 'ws_1',
      habitId: 'habit_1',
      dayKey: '2026-09-17',
      value: 30,
      note: null,
      status: 'COMPLETED',
      skipped: false,
      goalValueSnapshot: 30,
      goalUnitSnapshot: 'duration',
      goalPeriodSnapshot: 'DAY',
      checklistDone: 0,
      checklistTotal: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
    prismaMock.growthHabitCheckIn.findMany.mockResolvedValue([
      {
        id: 'ci_1',
        habitId: 'habit_1',
        dayKey: '2026-09-17',
        value: 30,
        skipped: false,
        createdAt: NOW,
        status: 'COMPLETED',
      },
    ]);
    prismaMock.growthHabit.update.mockResolvedValue({ ...HABIT, targetValue: 30, targetUnit: 'duration' });

    const habit = await createHabitLog(
      'ws_1',
      'habit_1',
      'idn_1',
      { value: 10 },
      prismaMock as never,
      NOW,
    );
    expect(habit.todayStatus).toBe('COMPLETED');
    expect(habit.todayProgress).toBe(1);
  });

  it('rejects new logs on archived habits', async () => {
    prismaMock.growthHabit.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...HABIT, isArchived: true });
    await expect(
      createHabitLog('ws_1', 'habit_1', 'idn_1', { value: 10 }, prismaMock as never, NOW),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('skipHabitDay', () => {
  it('marks the day skipped without failing', async () => {
    prismaMock.growthHabit.findFirst.mockResolvedValue(HABIT);
    prismaMock.growthHabitCheckIn.upsert.mockResolvedValue({
      id: 'ci_1',
      workspaceId: 'ws_1',
      habitId: 'habit_1',
      dayKey: '2026-09-17',
      value: 0,
      note: null,
      status: 'SKIPPED',
      skipped: true,
      goalValueSnapshot: 20,
      goalUnitSnapshot: 'words',
      goalPeriodSnapshot: 'DAY',
      checklistDone: 0,
      checklistTotal: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
    prismaMock.growthHabit.update.mockResolvedValue(HABIT);
    prismaMock.growthHabitCheckIn.findMany.mockResolvedValue([
      {
        id: 'ci_1',
        workspaceId: 'ws_1',
        habitId: 'habit_1',
        dayKey: '2026-09-17',
        value: 0,
        note: null,
        status: 'SKIPPED',
        skipped: true,
        goalValueSnapshot: 20,
        goalUnitSnapshot: 'words',
        goalPeriodSnapshot: 'DAY',
        checklistDone: 0,
        checklistTotal: 0,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]);
    const habit = await skipHabitDay(
      'ws_1',
      'habit_1',
      'idn_1',
      {},
      prismaMock as never,
      NOW,
    );
    expect(habit.todayStatus).toBe('SKIPPED');
  });
});

describe('authorization', () => {
  it('hides another workspace habit', async () => {
    prismaMock.growthHabit.findFirst.mockResolvedValue(null);
    await expect(getGrowthHabit('ws_1', 'habit_other', prismaMock as never, NOW)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('does not allow logging against another workspace habit', async () => {
    prismaMock.growthHabit.findFirst.mockResolvedValue(null);
    await expect(
      createHabitLog('ws_1', 'habit_other', 'idn_1', { value: 10 }, prismaMock as never, NOW),
    ).rejects.toMatchObject({ statusCode: 404 });
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
        status: 'COMPLETED',
        skipped: false,
        goalValueSnapshot: 20,
        goalUnitSnapshot: 'words',
        goalPeriodSnapshot: 'DAY',
        checklistDone: 0,
        checklistTotal: 0,
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
