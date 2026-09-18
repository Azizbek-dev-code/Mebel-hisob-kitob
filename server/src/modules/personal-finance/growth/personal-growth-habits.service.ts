import {
  GrowthHabitFrequency,
  GrowthTodoStatus,
  GrowthXpSource,
  MAX_DAILY_GOALS,
  WorkspaceStatus,
  WorkspaceType,
  computeHabitStreak,
  isCheckInComplete,
  isHabitDueToday,
  toDayKey,
  type CheckInGrowthHabitRequest,
  type CreateGrowthHabitRequest,
  type GrowthDailyGoalDto,
  type GrowthDailyGoalsResponse,
  type GrowthHabitDto,
  type GrowthHabitListResponse,
  type GrowthTodayProgressResponse,
  type UpdateGrowthDailyGoalRequest,
  type UpdateGrowthHabitRequest,
  type UpsertGrowthDailyGoalsRequest,
} from '@furniture-erp/shared';
import type {
  GrowthDailyGoal,
  GrowthHabit,
  GrowthHabitCheckIn,
  PrismaClient,
} from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';

import { tryAwardXp } from './personal-growth-xp.service.js';
import { assertGrowthQuota } from './personal-growth-premium.service.js';

type DbClient = Pick<
  PrismaClient,
  'workspace' | 'growthHabit' | 'growthHabitCheckIn' | 'growthDailyGoal' | 'growthTodo'
> & {
  personalSubscription?: PrismaClient['personalSubscription'];
};

async function assertPersonalWorkspace(workspaceId: string, db: DbClient): Promise<void> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, type: true, status: true, storeId: true },
  });
  if (
    !workspace ||
    workspace.type !== WorkspaceType.PERSONAL ||
    workspace.status !== WorkspaceStatus.ACTIVE ||
    workspace.storeId !== null
  ) {
    throw ApiError.forbidden('Shaxsiy moliya ish joyi topilmadi');
  }
}

function toCheckInDto(row: GrowthHabitCheckIn) {
  return {
    id: row.id,
    habitId: row.habitId,
    dayKey: row.dayKey,
    value: row.value,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

function toHabitDto(
  row: GrowthHabit,
  todayKey: string,
  completedDayKeys: string[],
  todayCheckIn: GrowthHabitCheckIn | null,
): GrowthHabitDto {
  const dueToday = isHabitDueToday({
    frequency: row.frequency as GrowthHabitFrequency,
    intervalDays: row.intervalDays,
    todayKey,
    completedDayKeys,
  });
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    frequency: row.frequency as GrowthHabitFrequency,
    intervalDays: row.intervalDays,
    targetValue: row.targetValue,
    targetUnit: row.targetUnit,
    remindMinutesBefore: row.remindMinutesBefore,
    linkedGoalId: row.linkedGoalId,
    isArchived: row.isArchived,
    sortOrder: row.sortOrder,
    currentStreak: row.currentStreak,
    bestStreak: row.bestStreak,
    todayCheckIn: todayCheckIn ? toCheckInDto(todayCheckIn) : null,
    dueToday,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDailyGoalDto(row: GrowthDailyGoal): GrowthDailyGoalDto {
  return {
    id: row.id,
    dayKey: row.dayKey,
    title: row.title,
    estimatedMinutes: row.estimatedMinutes,
    isDone: row.isDone,
    sortOrder: row.sortOrder,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function validateFrequency(
  frequency: GrowthHabitFrequency,
  intervalDays: number | null | undefined,
): number | null {
  if (frequency === GrowthHabitFrequency.CUSTOM) {
    const days = intervalDays == null ? null : Math.floor(intervalDays);
    if (days == null || days < 1) {
      throw ApiError.badRequest('CUSTOM odat uchun intervalDays majburiy');
    }
    return days;
  }
  return null;
}

async function loadCompletedDayKeys(
  habitId: string,
  db: DbClient,
): Promise<string[]> {
  const rows = await db.growthHabitCheckIn.findMany({
    where: { habitId },
    select: { dayKey: true, value: true },
    orderBy: { dayKey: 'asc' },
  });
  return rows
    .filter((row) => row.value > 0)
    .map((row) => row.dayKey);
}

async function refreshHabitStreak(
  habit: GrowthHabit,
  todayKey: string,
  db: DbClient,
): Promise<GrowthHabit> {
  const rows = await db.growthHabitCheckIn.findMany({
    where: { habitId: habit.id },
    select: { dayKey: true, value: true },
    orderBy: { dayKey: 'asc' },
  });
  const qualifying = rows
    .filter((row) => isCheckInComplete(row.value, habit.targetValue))
    .map((row) => row.dayKey);
  const streak = computeHabitStreak({
    frequency: habit.frequency as GrowthHabitFrequency,
    completedDayKeys: qualifying,
    todayKey,
  });
  return db.growthHabit.update({
    where: { id: habit.id },
    data: {
      currentStreak: streak.currentStreak,
      bestStreak: Math.max(habit.bestStreak, streak.bestStreak),
    },
  });
}

export async function listGrowthHabits(
  workspaceId: string,
  opts: { includeArchived?: boolean } = {},
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthHabitListResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const todayKey = toDayKey(now);

  const habits = await db.growthHabit.findMany({
    where: {
      workspaceId,
      ...(opts.includeArchived ? {} : { isArchived: false }),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  const checkIns = await db.growthHabitCheckIn.findMany({
    where: { workspaceId, habitId: { in: habits.map((h) => h.id) } },
    orderBy: { dayKey: 'asc' },
  });

  const byHabit = new Map<string, GrowthHabitCheckIn[]>();
  for (const row of checkIns) {
    const list = byHabit.get(row.habitId) ?? [];
    list.push(row);
    byHabit.set(row.habitId, list);
  }

  const items = habits.map((habit) => {
    const rows = byHabit.get(habit.id) ?? [];
    const completed = rows
      .filter((r) => isCheckInComplete(r.value, habit.targetValue))
      .map((r) => r.dayKey);
    const todayCheckIn = rows.find((r) => r.dayKey === todayKey) ?? null;
    return toHabitDto(habit, todayKey, completed, todayCheckIn);
  });

  const active = items.filter((item) => !item.isArchived);
  return {
    items,
    activeCount: active.length,
    dueTodayCount: active.filter((item) => item.dueToday).length,
    bestCurrentStreak: active.reduce((max, item) => Math.max(max, item.currentStreak), 0),
  };
}

export async function createGrowthHabit(
  workspaceId: string,
  identityId: string,
  body: CreateGrowthHabitRequest,
  db: DbClient = defaultPrisma,
): Promise<GrowthHabitDto> {
  await assertPersonalWorkspace(workspaceId, db);

  const activeCount = await db.growthHabit.count({
    where: { workspaceId, isArchived: false },
  });
  await assertGrowthQuota(workspaceId, identityId, 'activeHabits', activeCount);

  const frequency = body.frequency ?? GrowthHabitFrequency.DAILY;
  const intervalDays = validateFrequency(frequency, body.intervalDays);
  const targetValue = body.targetValue ?? 1;
  if (!(targetValue > 0) || targetValue > 1_000_000) {
    throw ApiError.badRequest('targetValue noto‘g‘ri');
  }

  const row = await db.growthHabit.create({
    data: {
      workspaceId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      category: body.category?.trim() || null,
      frequency,
      intervalDays,
      targetValue,
      targetUnit: (body.targetUnit?.trim() || 'times').slice(0, 40),
      remindMinutesBefore: body.remindMinutesBefore ?? null,
      linkedGoalId: body.linkedGoalId ?? null,
    },
  });

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_HABIT_CREATED',
    entityType: 'GROWTH_HABIT',
    entityId: row.id,
    summary: `Growth habit created: ${row.title}`,
    metadata: { workspaceId, title: row.title },
  });

  return toHabitDto(row, toDayKey(new Date()), [], null);
}

export async function updateGrowthHabit(
  workspaceId: string,
  habitId: string,
  identityId: string,
  body: UpdateGrowthHabitRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthHabitDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await db.growthHabit.findFirst({ where: { id: habitId, workspaceId } });
  if (!existing) throw ApiError.notFound('Odat topilmadi');

  const frequency = body.frequency ?? (existing.frequency as GrowthHabitFrequency);
  const intervalDays =
    body.frequency !== undefined || body.intervalDays !== undefined
      ? validateFrequency(
          frequency,
          body.intervalDays !== undefined ? body.intervalDays : existing.intervalDays,
        )
      : existing.intervalDays;

  if (body.isArchived === false && existing.isArchived) {
    const activeCount = await db.growthHabit.count({
      where: { workspaceId, isArchived: false },
    });
    await assertGrowthQuota(workspaceId, identityId, 'activeHabits', activeCount);
  }

  const updated = await db.growthHabit.update({
    where: { id: habitId },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.description !== undefined
        ? { description: body.description?.trim() || null }
        : {}),
      ...(body.category !== undefined ? { category: body.category?.trim() || null } : {}),
      ...(body.frequency !== undefined ? { frequency: body.frequency } : {}),
      ...(body.frequency !== undefined || body.intervalDays !== undefined
        ? { intervalDays }
        : {}),
      ...(body.targetValue !== undefined ? { targetValue: body.targetValue } : {}),
      ...(body.targetUnit !== undefined
        ? { targetUnit: body.targetUnit.trim().slice(0, 40) || 'times' }
        : {}),
      ...(body.remindMinutesBefore !== undefined
        ? { remindMinutesBefore: body.remindMinutesBefore }
        : {}),
      ...(body.linkedGoalId !== undefined ? { linkedGoalId: body.linkedGoalId } : {}),
      ...(body.isArchived !== undefined ? { isArchived: body.isArchived } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
  });

  const refreshed =
    body.targetValue !== undefined
      ? await refreshHabitStreak(updated, toDayKey(now), db)
      : updated;

  const keys = await loadCompletedDayKeys(refreshed.id, db);
  const todayKey = toDayKey(now);
  const todayCheckIn = await db.growthHabitCheckIn.findFirst({
    where: { habitId: refreshed.id, dayKey: todayKey },
  });

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_HABIT_UPDATED',
    entityType: 'GROWTH_HABIT',
    entityId: refreshed.id,
    summary: `Growth habit updated: ${refreshed.title}`,
    metadata: { workspaceId },
  });

  return toHabitDto(
    refreshed,
    todayKey,
    keys.filter((k) => {
      // loadCompletedDayKeys already filtered value>0; target may have changed
      return true;
    }),
    todayCheckIn,
  );
}

export async function checkInGrowthHabit(
  workspaceId: string,
  habitId: string,
  body: CheckInGrowthHabitRequest,
  identityId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthHabitDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const habit = await db.growthHabit.findFirst({
    where: { id: habitId, workspaceId, isArchived: false },
  });
  if (!habit) throw ApiError.notFound('Odat topilmadi');

  const dayKey = body.dayKey?.trim() || toDayKey(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    throw ApiError.badRequest('dayKey noto‘g‘ri');
  }
  // Anti backfill spam: only today or yesterday.
  const todayKey = toDayKey(now);
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = toDayKey(yesterday);
  if (dayKey !== todayKey && dayKey !== yesterdayKey) {
    throw ApiError.badRequest('Faqat bugun yoki kecha uchun belgilash mumkin');
  }

  const value = body.value ?? habit.targetValue;
  if (!(value > 0) || value > 1_000_000) {
    throw ApiError.badRequest('value noto‘g‘ri');
  }

  const checkIn = await db.growthHabitCheckIn.upsert({
    where: { habitId_dayKey: { habitId, dayKey } },
    create: {
      workspaceId,
      habitId,
      dayKey,
      value,
      note: body.note?.trim() || null,
    },
    update: {
      value,
      note: body.note === undefined ? undefined : body.note?.trim() || null,
    },
  });

  const refreshed = await refreshHabitStreak(habit, todayKey, db);
  const keys = (
    await db.growthHabitCheckIn.findMany({
      where: { habitId },
      select: { dayKey: true, value: true },
    })
  )
    .filter((r) => isCheckInComplete(r.value, refreshed.targetValue))
    .map((r) => r.dayKey);
  const todayCheckIn = await db.growthHabitCheckIn.findFirst({
    where: { habitId, dayKey: todayKey },
  });

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_HABIT_CHECK_IN',
    entityType: 'GROWTH_HABIT',
    entityId: habitId,
    summary: `Growth habit check-in: ${habit.title}`,
    metadata: { workspaceId, dayKey, value },
  });

  if (isCheckInComplete(value, refreshed.targetValue)) {
    await tryAwardXp({
      workspaceId,
      identityId,
      source: GrowthXpSource.HABIT_CHECK_IN,
      sourceEntityId: checkIn.id,
      summary: `Habit: ${habit.title}`,
      dayKey,
    });
  }

  return toHabitDto(refreshed, todayKey, keys, todayCheckIn);
}

export async function getDailyGoals(
  workspaceId: string,
  dayKey: string | undefined,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthDailyGoalsResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const key = dayKey?.trim() || toDayKey(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw ApiError.badRequest('dayKey noto‘g‘ri');

  const items = await db.growthDailyGoal.findMany({
    where: { workspaceId, dayKey: key },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const dtos = items.map(toDailyGoalDto);
  return {
    dayKey: key,
    items: dtos,
    doneCount: dtos.filter((i) => i.isDone).length,
    totalCount: dtos.length,
  };
}

export async function upsertDailyGoals(
  workspaceId: string,
  body: UpsertGrowthDailyGoalsRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthDailyGoalsResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const dayKey = body.dayKey?.trim() || toDayKey(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) throw ApiError.badRequest('dayKey noto‘g‘ri');
  if (body.items.length > MAX_DAILY_GOALS) {
    throw ApiError.badRequest(`Kunlik maqsadlar ${MAX_DAILY_GOALS} tadan oshmasin`);
  }

  const existing = await db.growthDailyGoal.findMany({
    where: { workspaceId, dayKey },
  });
  const keepIds = new Set(body.items.map((i) => i.id).filter(Boolean) as string[]);

  for (const row of existing) {
    if (!keepIds.has(row.id)) {
      await db.growthDailyGoal.delete({ where: { id: row.id } });
    }
  }

  const saved: GrowthDailyGoal[] = [];
  for (let i = 0; i < body.items.length; i += 1) {
    const item = body.items[i]!;
    const title = item.title.trim();
    if (!title) throw ApiError.badRequest('Maqsad nomi bo‘sh');
    const isDone = Boolean(item.isDone);
    if (item.id) {
      const owned = existing.find((e) => e.id === item.id);
      if (!owned) throw ApiError.notFound('Kunlik maqsad topilmadi');
      saved.push(
        await db.growthDailyGoal.update({
          where: { id: item.id },
          data: {
            title,
            estimatedMinutes: item.estimatedMinutes ?? null,
            isDone,
            sortOrder: i,
            completedAt: isDone ? owned.completedAt ?? now : null,
          },
        }),
      );
    } else {
      saved.push(
        await db.growthDailyGoal.create({
          data: {
            workspaceId,
            dayKey,
            title,
            estimatedMinutes: item.estimatedMinutes ?? null,
            isDone,
            sortOrder: i,
            completedAt: isDone ? now : null,
          },
        }),
      );
    }
  }

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_DAILY_GOALS_UPSERT',
    entityType: 'GROWTH_DAILY_GOAL',
    entityId: workspaceId,
    summary: `Daily goals upserted (${saved.length})`,
    metadata: { workspaceId, dayKey, count: saved.length },
  });

  const dtos = saved.map(toDailyGoalDto);
  return {
    dayKey,
    items: dtos,
    doneCount: dtos.filter((i) => i.isDone).length,
    totalCount: dtos.length,
  };
}

export async function updateDailyGoal(
  workspaceId: string,
  goalId: string,
  body: UpdateGrowthDailyGoalRequest,
  identityId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthDailyGoalDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const existing = await db.growthDailyGoal.findFirst({
    where: { id: goalId, workspaceId },
  });
  if (!existing) throw ApiError.notFound('Kunlik maqsad topilmadi');

  const updated = await db.growthDailyGoal.update({
    where: { id: goalId },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.estimatedMinutes !== undefined
        ? { estimatedMinutes: body.estimatedMinutes }
        : {}),
      ...(body.isDone !== undefined
        ? {
            isDone: body.isDone,
            completedAt: body.isDone ? existing.completedAt ?? now : null,
          }
        : {}),
    },
  });

  if (body.isDone === true && !existing.isDone) {
    await tryAwardXp({
      workspaceId,
      identityId,
      source: GrowthXpSource.DAILY_GOAL_DONE,
      sourceEntityId: updated.id,
      summary: `Daily goal: ${updated.title}`,
      dayKey: updated.dayKey,
    });
  }

  return toDailyGoalDto(updated);
}

export async function getTodayProgress(
  workspaceId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthTodayProgressResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const dayKey = toDayKey(now);
  const habits = await listGrowthHabits(workspaceId, {}, db, now);
  const daily = await getDailyGoals(workspaceId, dayKey, db, now);

  const focusTodos = await db.growthTodo.findMany({
    where: { workspaceId, isDailyFocus: true },
    select: { status: true },
  });
  const focusTodosTotal = focusTodos.length;
  const focusTodosDone = focusTodos.filter((t) => t.status === GrowthTodoStatus.DONE).length;

  const active = habits.items.filter((h) => !h.isArchived);
  const habitsDone = active.filter(
    (h) => h.todayCheckIn && isCheckInComplete(h.todayCheckIn.value, h.targetValue),
  ).length;
  const habitsExpected = active.filter(
    (h) =>
      h.dueToday ||
      (h.todayCheckIn && isCheckInComplete(h.todayCheckIn.value, h.targetValue)),
  ).length;

  const done = habitsDone + daily.doneCount + focusTodosDone;
  const total = habitsExpected + daily.totalCount + focusTodosTotal;
  const percent = total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100));

  return {
    dayKey,
    habitsDue: habits.dueTodayCount,
    habitsDone,
    dailyGoalsDone: daily.doneCount,
    dailyGoalsTotal: daily.totalCount,
    focusTodosDone,
    focusTodosTotal,
    percent,
    bestCurrentStreak: habits.bestCurrentStreak,
  };
}
