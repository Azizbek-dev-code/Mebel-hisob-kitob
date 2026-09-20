import {
  DEFAULT_HABIT_TIMEZONE,
  GrowthHabitBadMode,
  GrowthHabitDayStatus,
  GrowthHabitFrequency,
  GrowthHabitGoalPeriod,
  GrowthHabitKind,
  GrowthHabitScheduleKind,
  GrowthHabitTimeOfDay,
  frequencyFromSchedule,
  isDayKey,
  scheduleFromFrequency,
  toZonedDayKey,
  type CreateGrowthHabitRequest,
  type GrowthHabitCheckInDto,
  type GrowthHabitChecklistItemDto,
  type GrowthHabitDto,
  type GrowthHabitLogDto,
  type HabitConfigSlice,
  type HabitConfigVersionSlice,
  type UpdateGrowthHabitRequest,
} from '@furniture-erp/shared';
import type { GrowthHabit, GrowthHabitCheckIn, GrowthHabitChecklistItem, GrowthHabitLog, Prisma } from '@prisma/client';

import { ApiError } from '../../../utils/api-error.js';

export const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function resolveHabitTimezone(timezone: string | null | undefined): string {
  return timezone?.trim() || DEFAULT_HABIT_TIMEZONE;
}

export function todayKeyFor(now: Date, timezone: string): string {
  return toZonedDayKey(now, timezone);
}

export function assertDayKey(value: string | undefined, fallback: string): string {
  const key = value?.trim() || fallback;
  if (!isDayKey(key)) throw ApiError.badRequest('dayKey noto‘g‘ri');
  return key;
}

export function normalizeWeekdays(weekdays: readonly number[] | undefined): number[] {
  if (!weekdays?.length) return [];
  const unique = [...new Set(weekdays.map((day) => Math.floor(day)).filter((day) => day >= 1 && day <= 7))];
  return unique.sort((a, b) => a - b);
}

export function parseConfigSnapshot(raw: unknown, fallback: HabitConfigSlice): HabitConfigSlice {
  if (!raw || typeof raw !== 'object') return fallback;
  const row = raw as Record<string, unknown>;
  const weekdays = Array.isArray(row.weekdays)
    ? normalizeWeekdays(row.weekdays.filter((item): item is number => typeof item === 'number'))
    : fallback.weekdays;
  return {
    kind: row.kind === GrowthHabitKind.BAD ? GrowthHabitKind.BAD : GrowthHabitKind.GOOD,
    badMode:
      row.badMode === GrowthHabitBadMode.QUIT || row.badMode === GrowthHabitBadMode.LIMIT
        ? row.badMode
        : fallback.badMode,
    scheduleKind:
      typeof row.scheduleKind === 'string' &&
      (Object.values(GrowthHabitScheduleKind) as string[]).includes(row.scheduleKind)
        ? (row.scheduleKind as HabitConfigSlice['scheduleKind'])
        : fallback.scheduleKind,
    weekdays,
    intervalDays: typeof row.intervalDays === 'number' ? row.intervalDays : fallback.intervalDays,
    intervalAnchorDayKey:
      typeof row.intervalAnchorDayKey === 'string' ? row.intervalAnchorDayKey : fallback.intervalAnchorDayKey,
    goalValue: typeof row.goalValue === 'number' ? row.goalValue : fallback.goalValue,
    goalUnit: typeof row.goalUnit === 'string' ? row.goalUnit : fallback.goalUnit,
    goalPeriod:
      row.goalPeriod === GrowthHabitGoalPeriod.WEEK
        ? GrowthHabitGoalPeriod.WEEK
        : row.goalPeriod === GrowthHabitGoalPeriod.MONTH
          ? GrowthHabitGoalPeriod.MONTH
          : row.goalPeriod === GrowthHabitGoalPeriod.DAY
            ? GrowthHabitGoalPeriod.DAY
            : fallback.goalPeriod,
    startDayKey: typeof row.startDayKey === 'string' ? row.startDayKey : fallback.startDayKey,
    endDayKey: typeof row.endDayKey === 'string' ? row.endDayKey : fallback.endDayKey,
  };
}

export function sliceFromHabit(row: GrowthHabit): HabitConfigSlice {
  const weekdays = Array.isArray(row.weekdays) ? normalizeWeekdays(row.weekdays) : [];
  const scheduleKind =
    (row.scheduleKind as HabitConfigSlice['scheduleKind'] | undefined) ||
    scheduleFromFrequency(row.frequency as GrowthHabitFrequency, weekdays);
  return {
    kind: row.kind === GrowthHabitKind.BAD ? GrowthHabitKind.BAD : GrowthHabitKind.GOOD,
    badMode:
      row.badMode === GrowthHabitBadMode.QUIT || row.badMode === GrowthHabitBadMode.LIMIT
        ? row.badMode
        : null,
    scheduleKind,
    weekdays,
    intervalDays: row.intervalDays,
    intervalAnchorDayKey: row.startDayKey,
    goalValue: row.targetValue,
    goalUnit: row.targetUnit,
    goalPeriod:
      row.goalPeriod === GrowthHabitGoalPeriod.WEEK || row.goalPeriod === GrowthHabitGoalPeriod.MONTH
        ? row.goalPeriod
        : GrowthHabitGoalPeriod.DAY,
    startDayKey: row.startDayKey,
    endDayKey: row.endDayKey,
  };
}

export function versionsFromRows(
  rows: Array<{ effectiveFrom: string; effectiveTo: string | null; snapshot: unknown }>,
  fallback: HabitConfigSlice,
): HabitConfigVersionSlice[] {
  return rows.map((row) => ({
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    config: parseConfigSnapshot(row.snapshot, fallback),
  }));
}

export function resolveSchedule(body: {
  frequency?: GrowthHabitFrequency;
  scheduleKind?: string | null;
  weekdays?: number[];
  intervalDays?: number | null;
}): {
  frequency: GrowthHabitFrequency;
  scheduleKind: HabitConfigSlice['scheduleKind'];
  weekdays: number[];
  intervalDays: number | null;
} {
  const weekdays = normalizeWeekdays(body.weekdays);
  let scheduleKind = body.scheduleKind as HabitConfigSlice['scheduleKind'] | undefined;
  if (!scheduleKind && body.frequency) {
    scheduleKind = scheduleFromFrequency(body.frequency, weekdays);
  }
  scheduleKind = scheduleKind ?? GrowthHabitScheduleKind.EVERY_DAY;
  if (!(Object.values(GrowthHabitScheduleKind) as string[]).includes(scheduleKind)) {
    throw ApiError.badRequest('scheduleKind noto‘g‘ri');
  }
  const frequency = body.frequency ?? frequencyFromSchedule(scheduleKind);
  let intervalDays = body.intervalDays ?? null;
  if (scheduleKind === GrowthHabitScheduleKind.INTERVAL || frequency === GrowthHabitFrequency.CUSTOM) {
    const days = intervalDays == null ? null : Math.floor(intervalDays);
    if (days == null || days < 1) {
      throw ApiError.badRequest('CUSTOM odat uchun intervalDays majburiy');
    }
    intervalDays = days;
  } else {
    intervalDays = null;
  }
  if (scheduleKind === GrowthHabitScheduleKind.WEEKDAYS && weekdays.length === 0) {
    throw ApiError.badRequest('Hafta kunlarini tanlang');
  }
  return { frequency, scheduleKind, weekdays, intervalDays };
}

export function resolveKind(body: Pick<CreateGrowthHabitRequest & UpdateGrowthHabitRequest, 'kind' | 'badMode'>): {
  kind: string;
  badMode: string | null;
} {
  const kind = body.kind === GrowthHabitKind.BAD ? GrowthHabitKind.BAD : GrowthHabitKind.GOOD;
  if (kind === GrowthHabitKind.GOOD) return { kind, badMode: null };
  const badMode = body.badMode === GrowthHabitBadMode.LIMIT ? GrowthHabitBadMode.LIMIT : GrowthHabitBadMode.QUIT;
  return { kind, badMode };
}

export function toLogDto(row: GrowthHabitLog): GrowthHabitLogDto {
  return {
    id: row.id,
    habitId: row.habitId,
    dayKey: row.dayKey,
    value: row.value,
    note: row.note,
    loggedAt: row.loggedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toCheckInDto(row: GrowthHabitCheckIn): GrowthHabitCheckInDto {
  const createdAt =
    row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date().toISOString();
  return {
    id: row.id,
    habitId: row.habitId,
    dayKey: row.dayKey,
    value: row.value,
    note: row.note,
    status: (row.status as GrowthHabitCheckInDto['status']) || GrowthHabitDayStatus.COMPLETED,
    skipped: Boolean(row.skipped),
    goalValueSnapshot: row.goalValueSnapshot,
    goalUnitSnapshot: row.goalUnitSnapshot,
    checklistDone: row.checklistDone ?? 0,
    checklistTotal: row.checklistTotal ?? 0,
    createdAt,
  };
}

export function toChecklistDto(
  item: GrowthHabitChecklistItem,
  doneToday: boolean,
): GrowthHabitChecklistItemDto {
  return {
    id: item.id,
    habitId: item.habitId,
    title: item.title,
    sortOrder: item.sortOrder,
    isArchived: item.isArchived,
    doneToday,
  };
}

export function toHabitDto(input: {
  row: GrowthHabit;
  todayKey: string;
  todayCheckIn: GrowthHabitCheckIn | null;
  dueToday: boolean;
  todayValue: number;
  todayProgress: number;
  todayStatus: GrowthHabitDto['todayStatus'];
  checklist: GrowthHabitChecklistItemDto[];
}): GrowthHabitDto {
  const { row } = input;
  const weekdays = Array.isArray(row.weekdays) ? row.weekdays : [];
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    kind: row.kind === GrowthHabitKind.BAD ? GrowthHabitKind.BAD : GrowthHabitKind.GOOD,
    badMode:
      row.badMode === GrowthHabitBadMode.QUIT || row.badMode === GrowthHabitBadMode.LIMIT
        ? row.badMode
        : null,
    icon: row.icon ?? null,
    color: row.color ?? null,
    frequency: row.frequency as GrowthHabitFrequency,
    scheduleKind:
      (row.scheduleKind as GrowthHabitDto['scheduleKind']) ||
      scheduleFromFrequency(row.frequency as GrowthHabitFrequency, weekdays),
    intervalDays: row.intervalDays,
    weekdays,
    startDayKey: row.startDayKey ?? null,
    endDayKey: row.endDayKey ?? null,
    timeOfDay: (row.timeOfDay as GrowthHabitDto['timeOfDay']) || GrowthHabitTimeOfDay.ANY,
    reminderEnabled: Boolean(row.reminderEnabled),
    reminderTime: row.reminderTime ?? null,
    remindMinutesBefore: row.remindMinutesBefore,
    targetValue: row.targetValue,
    targetUnit: row.targetUnit,
    goalPeriod: (row.goalPeriod as GrowthHabitDto['goalPeriod']) || GrowthHabitGoalPeriod.DAY,
    notes: row.notes ?? row.description,
    stackAfterHabitId: row.stackAfterHabitId ?? null,
    stackCue: row.stackCue ?? null,
    linkedGoalId: row.linkedGoalId,
    isArchived: row.isArchived,
    sortOrder: row.sortOrder,
    currentStreak: row.currentStreak,
    bestStreak: row.bestStreak,
    todayCheckIn: input.todayCheckIn ? toCheckInDto(input.todayCheckIn) : null,
    todayValue: input.todayValue,
    todayProgress: input.todayProgress,
    todayStatus: input.todayStatus,
    dueToday: input.dueToday,
    checklist: input.checklist,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function snapshotFromSlice(slice: HabitConfigSlice): Prisma.InputJsonValue {
  return {
    kind: slice.kind,
    badMode: slice.badMode,
    scheduleKind: slice.scheduleKind,
    weekdays: [...slice.weekdays],
    intervalDays: slice.intervalDays,
    intervalAnchorDayKey: slice.intervalAnchorDayKey,
    goalValue: slice.goalValue,
    goalUnit: slice.goalUnit,
    goalPeriod: slice.goalPeriod,
    startDayKey: slice.startDayKey,
    endDayKey: slice.endDayKey,
  };
}

export function sliceFromWrite(input: {
  kind: string;
  badMode: string | null;
  scheduleKind: HabitConfigSlice['scheduleKind'];
  weekdays: number[];
  intervalDays: number | null;
  targetValue: number;
  targetUnit: string;
  goalPeriod: string;
  startDayKey: string | null;
  endDayKey: string | null;
}): HabitConfigSlice {
  return {
    kind: input.kind === GrowthHabitKind.BAD ? GrowthHabitKind.BAD : GrowthHabitKind.GOOD,
    badMode:
      input.badMode === GrowthHabitBadMode.QUIT || input.badMode === GrowthHabitBadMode.LIMIT
        ? input.badMode
        : null,
    scheduleKind: input.scheduleKind,
    weekdays: input.weekdays,
    intervalDays: input.intervalDays,
    intervalAnchorDayKey: input.startDayKey,
    goalValue: input.targetValue,
    goalUnit: input.targetUnit,
    goalPeriod:
      input.goalPeriod === GrowthHabitGoalPeriod.WEEK || input.goalPeriod === GrowthHabitGoalPeriod.MONTH
        ? input.goalPeriod
        : GrowthHabitGoalPeriod.DAY,
    startDayKey: input.startDayKey,
    endDayKey: input.endDayKey,
  };
}
