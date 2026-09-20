export const MAX_DAILY_GOALS = 3;
export const MAX_ACTIVE_HABITS = 40;

const DURATION_UNITS = new Set(['duration', 'hours', 'hour', 'soat', 'min', 'mins', 'minutes', 'daq', 'daqiqa']);

export function isDurationUnit(unit: string | null | undefined): boolean {
  return DURATION_UNITS.has((unit ?? '').trim().toLowerCase());
}

export function isHoursUnit(unit: string | null | undefined): boolean {
  const value = (unit ?? '').trim().toLowerCase();
  return value === 'hours' || value === 'hour' || value === 'soat';
}

/** Convert credited focus minutes into the habit's stored unit. */
export function durationLogFromMinutes(unit: string | null | undefined, minutes: number): number {
  const safe = Math.max(0, minutes);
  if (isHoursUnit(unit)) return Math.round((safe / 60) * 100) / 100;
  return safe;
}

export {
  addDayKey,
  bestTimeFromHours,
  buildHabitStatistics,
  buildInsights,
  buildRecommendations,
  computeHabitStreak,
  computeStreakFromStatuses,
  configNeedsVersion,
  configOnDay,
  DEFAULT_HABIT_TIMEZONE,
  eachDayKey,
  evaluateDayStatus,
  frequencyFromSchedule,
  grainKeyForDay,
  hourInTimeZone,
  isCheckInComplete,
  isDayKey,
  isHabitDueOnConfig,
  isHabitDueToday,
  isHabitScheduledOn,
  isoWeekday,
  mergeCalendars,
  mergeOverallKpi,
  MIN_BROKEN_SAMPLE,
  MIN_CORRELATION_SAMPLE,
  MIN_TIME_SAMPLE,
  MIN_WEEKDAY_SAMPLE,
  occurrenceGrain,
  pairCorrelation,
  parseDayKey,
  progressRatio,
  resolveProgressRange,
  scheduleFromFrequency,
  sliceFromLegacyFrequency,
  timeBucketFromHour,
  toDayKey,
  toMonthKey,
  toWeekKey,
  toZonedDayKey,
  weekdayCompletion,
  type BuiltHabitStatistics,
  type HabitCalendarCell,
  type HabitConfigSlice,
  type HabitConfigVersionSlice,
  type HabitDayRecord,
  type HabitInsight,
  type HabitRecommendation,
  type HabitStatsKpi,
  type HabitStreakResult,
  type HabitTrendPoint,
} from './habit-engine.js';
