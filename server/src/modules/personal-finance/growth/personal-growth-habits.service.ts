import {
  GrowthHabitDayStatus,
  GrowthHabitFrequency,
  GrowthHabitKind,
  GrowthTodoStatus,
  GrowthXpSource,
  MAX_DAILY_GOALS,
  WorkspaceStatus,
  WorkspaceType,
  addDayKey,
  buildHabitStatistics,
  configNeedsVersion,
  evaluateDayStatus,
  grainKeyForDay,
  hourInTimeZone,
  isCheckInComplete,
  isDurationUnit,
  isHabitDueOnConfig,
  occurrenceGrain,
  progressRatio,
  toDayKey,
  type CheckInGrowthHabitRequest,
  type CreateGrowthHabitLogRequest,
  type CreateGrowthHabitRequest,
  type GrowthDailyGoalDto,
  type GrowthDailyGoalsResponse,
  type GrowthHabitDetailResponse,
  type GrowthHabitDto,
  type GrowthHabitListResponse,
  type GrowthTodayProgressResponse,
  type HabitLogsResponse,
  type SkipGrowthHabitRequest,
  type ToggleHabitChecklistTickRequest,
  type UpdateGrowthDailyGoalRequest,
  type UpdateGrowthHabitLogRequest,
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
import {
  HH_MM,
  assertDayKey,
  resolveHabitTimezone,
  resolveKind,
  resolveSchedule,
  sliceFromHabit,
  snapshotFromSlice,
  todayKeyFor,
  toCheckInDto,
  toChecklistDto,
  toHabitDto,
  toLogDto,
  versionsFromRows,
} from './personal-growth-habits.helpers.js';

type DbClient = Pick<
  PrismaClient,
  | 'workspace'
  | 'growthHabit'
  | 'growthHabitCheckIn'
  | 'growthHabitLog'
  | 'growthHabitChecklistItem'
  | 'growthHabitChecklistTick'
  | 'growthHabitConfigVersion'
  | 'growthDailyGoal'
  | 'growthTodo'
  | 'personalProfile'
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

export async function resolveWorkspaceHabitTimezone(
  workspaceId: string,
  db: DbClient,
): Promise<string> {
  const profile = await db.personalProfile?.findUnique?.({
    where: { workspaceId },
    select: { timezone: true },
  });
  return resolveHabitTimezone(profile?.timezone);
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

async function requireHabit(
  workspaceId: string,
  habitId: string,
  db: DbClient,
  opts: { activeOnly?: boolean } = {},
): Promise<GrowthHabit> {
  const habit = await db.growthHabit.findFirst({
    where: {
      id: habitId,
      workspaceId,
      ...(opts.activeOnly ? { isArchived: false } : {}),
    },
  });
  if (habit) return habit;
  if (opts.activeOnly) {
    const archived = await db.growthHabit.findFirst({
      where: { id: habitId, workspaceId },
      select: { isArchived: true },
    });
    if (archived?.isArchived) {
      throw ApiError.badRequest('Arxivlangan odatga log kiritilmaydi');
    }
  }
  throw ApiError.notFound('Odat topilmadi');
}

async function loadChecklist(
  habitId: string,
  todayKey: string,
  db: DbClient,
) {
  const items = await db.growthHabitChecklistItem.findMany({
    where: { habitId, isArchived: false },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const ticks = await db.growthHabitChecklistTick.findMany({
    where: { habitId, dayKey: todayKey, itemId: { in: items.map((item) => item.id) } },
    select: { itemId: true },
  });
  const done = new Set(ticks.map((tick) => tick.itemId));
  return items.map((item) => toChecklistDto(item, done.has(item.id)));
}

function periodValue(
  habit: GrowthHabit,
  todayKey: string,
  rows: Array<{ dayKey: string; value: number }>,
): number {
  const slice = sliceFromHabit(habit);
  const grain = occurrenceGrain(slice);
  const key = grainKeyForDay(todayKey, grain);
  return rows
    .filter((row) => grainKeyForDay(row.dayKey, grain) === key)
    .reduce((sum, row) => sum + row.value, 0);
}

function mapHabitRow(
  habit: GrowthHabit,
  todayKey: string,
  checkIns: GrowthHabitCheckIn[],
  checklist: ReturnType<typeof toChecklistDto>[] | Awaited<ReturnType<typeof loadChecklist>>,
): GrowthHabitDto {
  const slice = sliceFromHabit(habit);
  const todayCheckIn = checkIns.find((row) => row.dayKey === todayKey) ?? null;
  const todayValue = todayCheckIn?.value ?? 0;
  const todaySkipped = Boolean(todayCheckIn?.skipped);
  const todayStatus = evaluateDayStatus({
    config: slice,
    dayKey: todayKey,
    todayKey,
    value: todayValue,
    skipped: todaySkipped,
  });
  const dueToday = isHabitDueOnConfig({
    config: slice,
    todayKey,
    todayValue,
    todaySkipped,
    periodValue: periodValue(habit, todayKey, checkIns),
  });
  return toHabitDto({
    row: habit,
    todayKey,
    todayCheckIn,
    dueToday,
    todayValue,
    todayProgress: progressRatio(todayValue, habit.targetValue),
    todayStatus,
    checklist: Array.isArray(checklist) ? checklist : [],
  });
}

async function refreshHabitStreak(
  habit: GrowthHabit,
  todayKey: string,
  db: DbClient,
): Promise<GrowthHabit> {
  const versions = await db.growthHabitConfigVersion.findMany({
    where: { habitId: habit.id },
    orderBy: { effectiveFrom: 'asc' },
  });
  const checkIns = await db.growthHabitCheckIn.findMany({
    where: { habitId: habit.id },
    select: { dayKey: true, value: true, skipped: true },
    orderBy: { dayKey: 'asc' },
  });
  const start = habit.startDayKey || (checkIns[0]?.dayKey ?? todayKey);
  const stats = buildHabitStatistics({
    fallback: sliceFromHabit(habit),
    versions: versionsFromRows(versions, sliceFromHabit(habit)),
    records: checkIns.map((row) => ({
      dayKey: row.dayKey,
      value: row.value,
      skipped: row.skipped,
    })),
    from: start,
    to: todayKey,
    todayKey,
  });
  return db.growthHabit.update({
    where: { id: habit.id },
    data: {
      currentStreak: stats.kpi.currentStreak,
      bestStreak: Math.max(habit.bestStreak, stats.kpi.longestStreak),
    },
  });
}

async function syncDayRollup(input: {
  workspaceId: string;
  habit: GrowthHabit;
  dayKey: string;
  todayKey: string;
  note?: string | null;
  skipped?: boolean;
  db: DbClient;
}): Promise<GrowthHabitCheckIn> {
  const { db, habit, dayKey, todayKey } = input;
  const logs = await db.growthHabitLog.findMany({
    where: { habitId: habit.id, dayKey },
    select: { value: true, note: true },
  });
  const items = await db.growthHabitChecklistItem.findMany({
    where: { habitId: habit.id, isArchived: false },
    select: { id: true },
  });
  const ticks = await db.growthHabitChecklistTick.count({
    where: { habitId: habit.id, dayKey, itemId: { in: items.map((item) => item.id) } },
  });
  const value = logs.reduce((sum, log) => sum + log.value, 0);
  const skipped = Boolean(input.skipped);
  const slice = sliceFromHabit(habit);
  const status = skipped
    ? GrowthHabitDayStatus.SKIPPED
    : evaluateDayStatus({
        config: slice,
        dayKey,
        todayKey,
        value,
        skipped,
      });
  const note = input.note !== undefined ? input.note : logs.find((log) => log.note)?.note ?? null;
  return db.growthHabitCheckIn.upsert({
    where: { habitId_dayKey: { habitId: habit.id, dayKey } },
    create: {
      workspaceId: input.workspaceId,
      habitId: habit.id,
      dayKey,
      value,
      note,
      status,
      skipped,
      goalValueSnapshot: habit.targetValue,
      goalUnitSnapshot: habit.targetUnit,
      goalPeriodSnapshot: habit.goalPeriod,
      checklistDone: ticks,
      checklistTotal: items.length,
    },
    update: {
      value,
      note,
      status,
      skipped,
      goalValueSnapshot: habit.targetValue,
      goalUnitSnapshot: habit.targetUnit,
      goalPeriodSnapshot: habit.goalPeriod,
      checklistDone: ticks,
      checklistTotal: items.length,
    },
  });
}

async function writeInitialConfig(
  workspaceId: string,
  habit: GrowthHabit,
  todayKey: string,
  db: DbClient,
): Promise<void> {
  await db.growthHabitConfigVersion.create({
    data: {
      workspaceId,
      habitId: habit.id,
      effectiveFrom: habit.startDayKey || todayKey,
      effectiveTo: null,
      snapshot: snapshotFromSlice(sliceFromHabit(habit)),
    },
  });
}

async function rotateConfigIfNeeded(
  workspaceId: string,
  previous: GrowthHabit,
  next: GrowthHabit,
  todayKey: string,
  db: DbClient,
): Promise<void> {
  if (!configNeedsVersion(sliceFromHabit(previous), sliceFromHabit(next))) return;
  const open = await db.growthHabitConfigVersion.findFirst({
    where: { habitId: next.id, effectiveTo: null },
    orderBy: { effectiveFrom: 'desc' },
  });
  if (open && open.effectiveFrom === todayKey) {
    await db.growthHabitConfigVersion.update({
      where: { id: open.id },
      data: { snapshot: snapshotFromSlice(sliceFromHabit(next)) },
    });
    return;
  }
  if (open) {
    const yesterday = addDayKey(todayKey, -1);
    await db.growthHabitConfigVersion.update({
      where: { id: open.id },
      data: { effectiveTo: yesterday < open.effectiveFrom ? open.effectiveFrom : yesterday },
    });
  }
  await db.growthHabitConfigVersion.create({
    data: {
      workspaceId,
      habitId: next.id,
      effectiveFrom: todayKey,
      effectiveTo: null,
      snapshot: snapshotFromSlice(sliceFromHabit(next)),
    },
  });
}

async function replaceChecklist(
  workspaceId: string,
  habitId: string,
  items: Array<{ title: string; sortOrder?: number }> | undefined,
  db: DbClient,
): Promise<void> {
  if (!items) return;
  const existing = await db.growthHabitChecklistItem.findMany({ where: { habitId } });
  for (const row of existing) {
    await db.growthHabitChecklistItem.update({
      where: { id: row.id },
      data: { isArchived: true },
    });
  }
  for (let i = 0; i < items.length; i += 1) {
    const title = items[i]!.title.trim();
    if (!title) continue;
    await db.growthHabitChecklistItem.create({
      data: {
        workspaceId,
        habitId,
        title: title.slice(0, 200),
        sortOrder: items[i]!.sortOrder ?? i,
      },
    });
  }
}

function validateTarget(value: number | undefined, fallback = 1): number {
  const target = value ?? fallback;
  if (!(target >= 0) || target > 1_000_000) {
    throw ApiError.badRequest('targetValue noto‘g‘ri');
  }
  return target;
}

function assertLogWindow(dayKey: string, todayKey: string): void {
  const yesterday = addDayKey(todayKey, -1);
  if (dayKey !== todayKey && dayKey !== yesterday) {
    throw ApiError.badRequest('Faqat bugun yoki kecha uchun belgilash mumkin');
  }
}

export async function listGrowthHabits(
  workspaceId: string,
  opts: { includeArchived?: boolean } = {},
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthHabitListResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);
  const lookback = addDayKey(todayKey, -62);

  const habits = await db.growthHabit.findMany({
    where: {
      workspaceId,
      ...(opts.includeArchived ? {} : { isArchived: false }),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const ids = habits.map((habit) => habit.id);
  const [checkIns, checklistItems, ticks] = await Promise.all([
    ids.length
      ? db.growthHabitCheckIn.findMany({
          where: { workspaceId, habitId: { in: ids }, dayKey: { gte: lookback } },
          orderBy: { dayKey: 'asc' },
        })
      : [],
    ids.length
      ? db.growthHabitChecklistItem.findMany({
          where: { habitId: { in: ids }, isArchived: false },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        })
      : [],
    ids.length
      ? db.growthHabitChecklistTick.findMany({
          where: { workspaceId, habitId: { in: ids }, dayKey: todayKey },
          select: { habitId: true, itemId: true },
        })
      : [],
  ]);

  const checkInByHabit = new Map<string, GrowthHabitCheckIn[]>();
  for (const row of checkIns) {
    const list = checkInByHabit.get(row.habitId) ?? [];
    list.push(row);
    checkInByHabit.set(row.habitId, list);
  }
  const tickSet = new Set(ticks.map((tick) => `${tick.habitId}:${tick.itemId}`));

  const items = habits.map((habit) => {
    const checklist = checklistItems
      .filter((item) => item.habitId === habit.id)
      .map((item) => toChecklistDto(item, tickSet.has(`${habit.id}:${item.id}`)));
    return mapHabitRow(habit, todayKey, checkInByHabit.get(habit.id) ?? [], checklist);
  });

  const active = items.filter((item) => !item.isArchived);
  return {
    items,
    activeCount: active.length,
    dueTodayCount: active.filter((item) => item.dueToday).length,
    bestCurrentStreak: active.reduce((max, item) => Math.max(max, item.currentStreak), 0),
    timezone,
    todayKey,
  };
}

export async function getGrowthHabit(
  workspaceId: string,
  habitId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthHabitDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);
  const habit = await requireHabit(workspaceId, habitId, db);
  const lookback = addDayKey(todayKey, -62);
  const [checkIns, checklist] = await Promise.all([
    db.growthHabitCheckIn.findMany({
      where: { habitId, dayKey: { gte: lookback } },
      orderBy: { dayKey: 'asc' },
    }),
    loadChecklist(habitId, todayKey, db),
  ]);
  return mapHabitRow(habit, todayKey, checkIns, checklist);
}

export async function createGrowthHabit(
  workspaceId: string,
  identityId: string,
  body: CreateGrowthHabitRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthHabitDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);

  const activeCount = await db.growthHabit.count({
    where: { workspaceId, isArchived: false },
  });
  await assertGrowthQuota(workspaceId, identityId, 'activeHabits', activeCount);

  const schedule = resolveSchedule({
    frequency: body.frequency,
    scheduleKind: body.scheduleKind,
    weekdays: body.weekdays,
    intervalDays: body.intervalDays,
  });
  const { kind, badMode } = resolveKind(body);
  const targetValue = validateTarget(body.targetValue, kind === GrowthHabitKind.BAD && badMode === 'QUIT' ? 0 : 1);
  if (body.reminderTime && !HH_MM.test(body.reminderTime)) {
    throw ApiError.badRequest('Eslatma vaqti HH:mm formatida bo‘lsin');
  }
  if (body.stackAfterHabitId) {
    const stacked = await db.growthHabit.findFirst({
      where: { id: body.stackAfterHabitId, workspaceId },
      select: { id: true },
    });
    if (!stacked) throw ApiError.badRequest('Stack odat topilmadi');
  }

  const row = await db.growthHabit.create({
    data: {
      workspaceId,
      title: body.title.trim(),
      description: body.description?.trim() || body.notes?.trim() || null,
      category: body.category?.trim() || null,
      kind,
      badMode,
      icon: body.icon?.trim() || null,
      color: body.color?.trim() || null,
      frequency: schedule.frequency,
      scheduleKind: schedule.scheduleKind,
      intervalDays: schedule.intervalDays,
      weekdays: schedule.weekdays,
      startDayKey: body.startDayKey || todayKey,
      endDayKey: body.endDayKey || null,
      timeOfDay: body.timeOfDay || 'ANY',
      reminderEnabled: Boolean(body.reminderEnabled || body.reminderTime || body.remindMinutesBefore),
      reminderTime: body.reminderTime || null,
      targetValue,
      targetUnit: (body.targetUnit?.trim() || 'times').slice(0, 40),
      goalPeriod: body.goalPeriod || 'DAY',
      notes: body.notes?.trim() || null,
      stackAfterHabitId: body.stackAfterHabitId || null,
      stackCue: body.stackCue?.trim() || null,
      remindMinutesBefore: body.remindMinutesBefore ?? null,
      linkedGoalId: body.linkedGoalId ?? null,
    },
  });

  await writeInitialConfig(workspaceId, row, todayKey, db);
  await replaceChecklist(workspaceId, row.id, body.checklist, db);

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_HABIT_CREATED',
    entityType: 'GROWTH_HABIT',
    entityId: row.id,
    summary: `Growth habit created: ${row.title}`,
    metadata: { workspaceId, title: row.title },
  });

  const checklist = await loadChecklist(row.id, todayKey, db);
  return mapHabitRow(row, todayKey, [], checklist);
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
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);
  const existing = await requireHabit(workspaceId, habitId, db);

  const schedule = resolveSchedule({
    frequency: body.frequency ?? (existing.frequency as GrowthHabitFrequency),
    scheduleKind: body.scheduleKind ?? existing.scheduleKind,
    weekdays: body.weekdays ?? existing.weekdays,
    intervalDays: body.intervalDays !== undefined ? body.intervalDays : existing.intervalDays,
  });
  const kindInput = resolveKind({
    kind: body.kind ?? (existing.kind as CreateGrowthHabitRequest['kind']),
    badMode: body.badMode !== undefined ? body.badMode : (existing.badMode as CreateGrowthHabitRequest['badMode']),
  });
  if (body.reminderTime && !HH_MM.test(body.reminderTime)) {
    throw ApiError.badRequest('Eslatma vaqti HH:mm formatida bo‘lsin');
  }
  if (body.stackAfterHabitId) {
    if (body.stackAfterHabitId === habitId) throw ApiError.badRequest('Odat o‘ziga stack qilinmaydi');
    const stacked = await db.growthHabit.findFirst({
      where: { id: body.stackAfterHabitId, workspaceId },
      select: { id: true },
    });
    if (!stacked) throw ApiError.badRequest('Stack odat topilmadi');
  }

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
      ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
      ...(body.category !== undefined ? { category: body.category?.trim() || null } : {}),
      ...(body.kind !== undefined || body.badMode !== undefined
        ? { kind: kindInput.kind, badMode: kindInput.badMode }
        : {}),
      ...(body.icon !== undefined ? { icon: body.icon?.trim() || null } : {}),
      ...(body.color !== undefined ? { color: body.color?.trim() || null } : {}),
      ...(body.frequency !== undefined || body.scheduleKind !== undefined || body.weekdays !== undefined || body.intervalDays !== undefined
        ? {
            frequency: schedule.frequency,
            scheduleKind: schedule.scheduleKind,
            intervalDays: schedule.intervalDays,
            weekdays: schedule.weekdays,
          }
        : {}),
      ...(body.startDayKey !== undefined ? { startDayKey: body.startDayKey } : {}),
      ...(body.endDayKey !== undefined ? { endDayKey: body.endDayKey } : {}),
      ...(body.timeOfDay !== undefined ? { timeOfDay: body.timeOfDay } : {}),
      ...(body.reminderEnabled !== undefined ? { reminderEnabled: body.reminderEnabled } : {}),
      ...(body.reminderTime !== undefined ? { reminderTime: body.reminderTime } : {}),
      ...(body.targetValue !== undefined ? { targetValue: validateTarget(body.targetValue, 0) } : {}),
      ...(body.targetUnit !== undefined ? { targetUnit: body.targetUnit.trim().slice(0, 40) || 'times' } : {}),
      ...(body.goalPeriod !== undefined ? { goalPeriod: body.goalPeriod } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      ...(body.stackAfterHabitId !== undefined ? { stackAfterHabitId: body.stackAfterHabitId } : {}),
      ...(body.stackCue !== undefined ? { stackCue: body.stackCue?.trim() || null } : {}),
      ...(body.remindMinutesBefore !== undefined ? { remindMinutesBefore: body.remindMinutesBefore } : {}),
      ...(body.linkedGoalId !== undefined ? { linkedGoalId: body.linkedGoalId } : {}),
      ...(body.isArchived !== undefined ? { isArchived: body.isArchived } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
  });

  await rotateConfigIfNeeded(workspaceId, existing, updated, todayKey, db);
  if (body.checklist) await replaceChecklist(workspaceId, habitId, body.checklist, db);

  const refreshed = await refreshHabitStreak(updated, todayKey, db);
  const lookback = addDayKey(todayKey, -62);
  const [checkIns, checklist] = await Promise.all([
    db.growthHabitCheckIn.findMany({
      where: { habitId, dayKey: { gte: lookback } },
    }),
    loadChecklist(habitId, todayKey, db),
  ]);

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: 'GROWTH_HABIT_UPDATED',
    entityType: 'GROWTH_HABIT',
    entityId: refreshed.id,
    summary: `Growth habit updated: ${refreshed.title}`,
    metadata: { workspaceId },
  });

  return mapHabitRow(refreshed, todayKey, checkIns, checklist);
}

async function applyLogAndRefresh(input: {
  workspaceId: string;
  identityId: string;
  habit: GrowthHabit;
  dayKey: string;
  todayKey: string;
  db: DbClient;
}): Promise<GrowthHabitDto> {
  const checkIn = await syncDayRollup({
    workspaceId: input.workspaceId,
    habit: input.habit,
    dayKey: input.dayKey,
    todayKey: input.todayKey,
    db: input.db,
  });
  const refreshed = await refreshHabitStreak(input.habit, input.todayKey, input.db);
  if (checkIn.status === GrowthHabitDayStatus.COMPLETED) {
    await tryAwardXp({
      workspaceId: input.workspaceId,
      identityId: input.identityId,
      source: GrowthXpSource.HABIT_CHECK_IN,
      sourceEntityId: checkIn.id,
      summary: `Habit: ${input.habit.title}`,
      dayKey: input.dayKey,
    });
  }
  const lookback = addDayKey(input.todayKey, -62);
  const [checkIns, checklist] = await Promise.all([
    input.db.growthHabitCheckIn.findMany({
      where: { habitId: input.habit.id, dayKey: { gte: lookback } },
    }),
    loadChecklist(input.habit.id, input.todayKey, input.db),
  ]);
  return mapHabitRow(refreshed, input.todayKey, checkIns, checklist);
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
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);
  const habit = await requireHabit(workspaceId, habitId, db, { activeOnly: true });
  const dayKey = assertDayKey(body.dayKey, todayKey);
  assertLogWindow(dayKey, todayKey);

  const existingLogs = await db.growthHabitLog.findMany({
    where: { habitId, dayKey },
    select: { value: true },
  });
  const current = existingLogs.reduce((sum, log) => sum + log.value, 0);
  const remaining = Math.max(0, habit.targetValue - current);
  if (
    habit.kind === GrowthHabitKind.GOOD &&
    isDurationUnit(habit.targetUnit) &&
    body.value == null
  ) {
    throw ApiError.badRequest('Vaqtli odatni taymer orqali belgilang');
  }
  const fallback =
    habit.kind === GrowthHabitKind.BAD && remaining === 0 ? 0 : remaining > 0 ? remaining : habit.targetValue;
  const value = body.value ?? fallback;
  if (habit.kind !== GrowthHabitKind.BAD && !(value > 0)) {
    throw ApiError.badRequest('value noto‘g‘ri');
  }
  if (value < 0 || value > 1_000_000) throw ApiError.badRequest('value noto‘g‘ri');

  await db.growthHabitLog.create({
    data: {
      workspaceId,
      habitId,
      dayKey,
      value,
      note: body.note?.trim() || null,
      loggedAt: now,
    },
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

  return applyLogAndRefresh({ workspaceId, identityId, habit, dayKey, todayKey, db });
}

export async function createHabitLog(
  workspaceId: string,
  habitId: string,
  identityId: string,
  body: CreateGrowthHabitLogRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthHabitDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);
  const habit = await requireHabit(workspaceId, habitId, db, { activeOnly: true });
  const dayKey = assertDayKey(body.dayKey, todayKey);
  assertLogWindow(dayKey, todayKey);
  if (body.value < 0 || body.value > 1_000_000) throw ApiError.badRequest('value noto‘g‘ri');
  const loggedAt = body.loggedAt ? new Date(body.loggedAt) : now;
  await db.growthHabitLog.create({
    data: {
      workspaceId,
      habitId,
      dayKey,
      value: body.value,
      note: body.note?.trim() || null,
      loggedAt,
    },
  });
  return applyLogAndRefresh({ workspaceId, identityId, habit, dayKey, todayKey, db });
}

export async function updateHabitLog(
  workspaceId: string,
  habitId: string,
  logId: string,
  identityId: string,
  body: UpdateGrowthHabitLogRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthHabitDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);
  const habit = await requireHabit(workspaceId, habitId, db, { activeOnly: true });
  const log = await db.growthHabitLog.findFirst({ where: { id: logId, habitId, workspaceId } });
  if (!log) throw ApiError.notFound('Log topilmadi');
  assertLogWindow(log.dayKey, todayKey);
  if (body.value !== undefined && (body.value < 0 || body.value > 1_000_000)) {
    throw ApiError.badRequest('value noto‘g‘ri');
  }
  await db.growthHabitLog.update({
    where: { id: logId },
    data: {
      ...(body.value !== undefined ? { value: body.value } : {}),
      ...(body.note !== undefined ? { note: body.note?.trim() || null } : {}),
    },
  });
  return applyLogAndRefresh({ workspaceId, identityId, habit, dayKey: log.dayKey, todayKey, db });
}

export async function deleteHabitLog(
  workspaceId: string,
  habitId: string,
  logId: string,
  identityId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthHabitDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);
  const habit = await requireHabit(workspaceId, habitId, db, { activeOnly: true });
  const log = await db.growthHabitLog.findFirst({ where: { id: logId, habitId, workspaceId } });
  if (!log) throw ApiError.notFound('Log topilmadi');
  assertLogWindow(log.dayKey, todayKey);
  await db.growthHabitLog.delete({ where: { id: logId } });
  return applyLogAndRefresh({ workspaceId, identityId, habit, dayKey: log.dayKey, todayKey, db });
}

export async function skipHabitDay(
  workspaceId: string,
  habitId: string,
  identityId: string,
  body: SkipGrowthHabitRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthHabitDto> {
  await assertPersonalWorkspace(workspaceId, db);
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);
  const habit = await requireHabit(workspaceId, habitId, db, { activeOnly: true });
  const dayKey = assertDayKey(body.dayKey, todayKey);
  assertLogWindow(dayKey, todayKey);
  await syncDayRollup({
    workspaceId,
    habit,
    dayKey,
    todayKey,
    skipped: true,
    note: body.note?.trim() || null,
    db,
  });
  const refreshed = await refreshHabitStreak(habit, todayKey, db);
  const lookback = addDayKey(todayKey, -62);
  const [checkIns, checklist] = await Promise.all([
    db.growthHabitCheckIn.findMany({ where: { habitId, dayKey: { gte: lookback } } }),
    loadChecklist(habitId, todayKey, db),
  ]);
  return mapHabitRow(refreshed, todayKey, checkIns, checklist);
}

export async function listHabitLogs(
  workspaceId: string,
  habitId: string,
  query: { from?: string; to?: string } = {},
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<HabitLogsResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  await requireHabit(workspaceId, habitId, db);
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);
  const from = query.from || addDayKey(todayKey, -62);
  const to = query.to || todayKey;
  const items = await db.growthHabitLog.findMany({
    where: { workspaceId, habitId, dayKey: { gte: from, lte: to } },
    orderBy: [{ loggedAt: 'desc' }],
    take: 500,
  });
  return { items: items.map(toLogDto) };
}

export async function toggleHabitChecklistTick(
  workspaceId: string,
  habitId: string,
  body: ToggleHabitChecklistTickRequest,
  db: DbClient = defaultPrisma,
  now = new Date(),
) {
  await assertPersonalWorkspace(workspaceId, db);
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const todayKey = todayKeyFor(now, timezone);
  const habit = await requireHabit(workspaceId, habitId, db, { activeOnly: true });
  const dayKey = assertDayKey(body.dayKey, todayKey);
  const item = await db.growthHabitChecklistItem.findFirst({
    where: { id: body.itemId, habitId, workspaceId, isArchived: false },
  });
  if (!item) throw ApiError.notFound('Checklist bandi topilmadi');
  const existing = await db.growthHabitChecklistTick.findFirst({
    where: { itemId: item.id, dayKey },
  });
  if (body.done && !existing) {
    await db.growthHabitChecklistTick.create({
      data: { workspaceId, habitId, itemId: item.id, dayKey },
    });
  } else if (!body.done && existing) {
    await db.growthHabitChecklistTick.delete({ where: { id: existing.id } });
  }
  await syncDayRollup({ workspaceId, habit, dayKey, todayKey, db });
  return loadChecklist(habitId, dayKey, db);
}

export async function getDailyGoals(
  workspaceId: string,
  dayKey: string | undefined,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthDailyGoalsResponse> {
  await assertPersonalWorkspace(workspaceId, db);
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const key = assertDayKey(dayKey, todayKeyFor(now, timezone));

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
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const dayKey = assertDayKey(body.dayKey, todayKeyFor(now, timezone));
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
  const timezone = await resolveWorkspaceHabitTimezone(workspaceId, db);
  const dayKey = todayKeyFor(now, timezone);
  const habits = await listGrowthHabits(workspaceId, {}, db, now);
  const daily = await getDailyGoals(workspaceId, dayKey, db, now);

  const focusTodos = await db.growthTodo.findMany({
    where: { workspaceId, isDailyFocus: true },
    select: { status: true },
  });
  const focusTodosTotal = focusTodos.length;
  const focusTodosDone = focusTodos.filter((t) => t.status === GrowthTodoStatus.DONE).length;

  const active = habits.items.filter((h) => !h.isArchived);
  const habitsDone = active.filter((h) => h.todayStatus === GrowthHabitDayStatus.COMPLETED).length;
  const habitsExpected = active.filter(
    (h) => h.dueToday || h.todayStatus === GrowthHabitDayStatus.COMPLETED,
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

export async function getHabitDetail(
  workspaceId: string,
  habitId: string,
  db: DbClient = defaultPrisma,
  now = new Date(),
): Promise<GrowthHabitDetailResponse> {
  const { getHabitStatistics } = await import('./personal-growth-habit-stats.service.js');
  const habit = await getGrowthHabit(workspaceId, habitId, db, now);
  const statistics = await getHabitStatistics(workspaceId, habitId, {}, db, now);
  const logs = await listHabitLogs(workspaceId, habitId, { from: statistics.from, to: statistics.to }, db, now);
  return { habit, statistics, logs: logs.items };
}

export { hourInTimeZone, toDayKey, toCheckInDto, isCheckInComplete };
