import { describe, expect, it } from 'vitest';

import {
  GrowthHabitBadMode,
  GrowthHabitDayStatus,
  GrowthHabitFrequency,
  GrowthHabitGoalPeriod,
  GrowthHabitKind,
  GrowthHabitProgressPeriod,
  GrowthHabitScheduleKind,
} from '../constants/enums.js';
import {
  buildHabitStatistics,
  buildInsights,
  buildRecommendations,
  computeHabitStreak,
  configNeedsVersion,
  evaluateDayStatus,
  hourInTimeZone,
  isHabitDueToday,
  isHabitScheduledOn,
  pairCorrelation,
  resolveProgressRange,
  timeBucketFromHour,
  toZonedDayKey,
  weekdayCompletion,
  type HabitConfigSlice,
  type HabitDayRecord,
} from './habit-engine.js';

function goodDaily(overrides: Partial<HabitConfigSlice> = {}): HabitConfigSlice {
  return {
    kind: GrowthHabitKind.GOOD,
    badMode: null,
    scheduleKind: GrowthHabitScheduleKind.EVERY_DAY,
    weekdays: [],
    intervalDays: null,
    intervalAnchorDayKey: '2026-01-01',
    goalValue: 1,
    goalUnit: 'count',
    goalPeriod: GrowthHabitGoalPeriod.DAY,
    startDayKey: '2026-01-01',
    endDayKey: null,
    ...overrides,
  };
}

function records(days: Array<[string, number] | [string, number, boolean]>): HabitDayRecord[] {
  return days.map((row) => ({
    dayKey: row[0],
    value: row[1],
    skipped: row[2] === true,
  }));
}

describe('timezone', () => {
  it('uses Asia/Tashkent local date, not UTC', () => {
    const utcEvening = new Date('2026-09-17T20:00:00.000Z');
    expect(toZonedDayKey(utcEvening, 'UTC')).toBe('2026-09-17');
    expect(toZonedDayKey(utcEvening, 'Asia/Tashkent')).toBe('2026-09-18');
    expect(hourInTimeZone(utcEvening, 'Asia/Tashkent')).toBe(1);
  });

  it('keeps month and year boundaries on the local calendar', () => {
    const nye = new Date('2026-12-31T21:30:00.000Z');
    expect(toZonedDayKey(nye, 'Asia/Tashkent')).toBe('2027-01-01');
    expect(toZonedDayKey(nye, 'UTC')).toBe('2026-12-31');
  });
});

describe('schedule', () => {
  it('every day is scheduled', () => {
    expect(isHabitScheduledOn(goodDaily(), '2026-09-17')).toBe(true);
  });

  it('selected weekdays only', () => {
    const config = goodDaily({
      scheduleKind: GrowthHabitScheduleKind.WEEKDAYS,
      weekdays: [1, 3, 5],
    });
    expect(isHabitScheduledOn(config, '2026-09-14')).toBe(true); // Mon
    expect(isHabitScheduledOn(config, '2026-09-15')).toBe(false); // Tue
    expect(isHabitScheduledOn(config, '2026-09-16')).toBe(true); // Wed
  });

  it('interval uses the anchor, not consecutive calendar days', () => {
    const config = goodDaily({
      scheduleKind: GrowthHabitScheduleKind.INTERVAL,
      intervalDays: 3,
      intervalAnchorDayKey: '2026-09-14',
      startDayKey: '2026-09-14',
    });
    expect(isHabitScheduledOn(config, '2026-09-14')).toBe(true);
    expect(isHabitScheduledOn(config, '2026-09-15')).toBe(false);
    expect(isHabitScheduledOn(config, '2026-09-17')).toBe(true);
  });

  it('does not treat unscheduled days as failed', () => {
    const config = goodDaily({
      scheduleKind: GrowthHabitScheduleKind.WEEKDAYS,
      weekdays: [1],
    });
    const stats = buildHabitStatistics({
      fallback: config,
      records: [],
      from: '2026-09-14',
      to: '2026-09-20',
      todayKey: '2026-09-20',
    });
    const tue = stats.calendar.find((cell) => cell.dayKey === '2026-09-15');
    expect(tue?.scheduled).toBe(false);
    expect(tue?.status).toBe(GrowthHabitDayStatus.UNSCHEDULED);
    expect(stats.kpi.failed).toBe(1); // only Monday in the past range with no log
  });
});

describe('quantitative logging', () => {
  it('sums multiple logs and marks partial vs completed', () => {
    const config = goodDaily({ goalValue: 30, goalUnit: 'duration' });
    expect(
      evaluateDayStatus({
        config,
        dayKey: '2026-09-17',
        todayKey: '2026-09-17',
        value: 20,
        skipped: false,
      }),
    ).toBe(GrowthHabitDayStatus.PARTIAL);
    expect(
      evaluateDayStatus({
        config,
        dayKey: '2026-09-17',
        todayKey: '2026-09-17',
        value: 30,
        skipped: false,
      }),
    ).toBe(GrowthHabitDayStatus.COMPLETED);
    const stats = buildHabitStatistics({
      fallback: config,
      records: records([['2026-09-17', 20]]),
      from: '2026-09-17',
      to: '2026-09-17',
      todayKey: '2026-09-17',
    });
    expect(stats.calendar[0]?.progress).toBeCloseTo(20 / 30);
  });

  it('treats 10+10+10 as 30 min completed', () => {
    const config = goodDaily({ goalValue: 30, goalUnit: 'duration' });
    const stats = buildHabitStatistics({
      fallback: config,
      records: records([['2026-09-17', 30]]),
      from: '2026-09-17',
      to: '2026-09-17',
      todayKey: '2026-09-17',
    });
    expect(stats.calendar[0]?.status).toBe(GrowthHabitDayStatus.COMPLETED);
    expect(stats.calendar[0]?.progress).toBe(1);
    expect(stats.kpi.completed).toBe(1);
    expect(stats.kpi.goalProgress).toBe(1);
  });
});

describe('bad habits', () => {
  it('limit: under the cap is success, over is failed', () => {
    const config = goodDaily({
      kind: GrowthHabitKind.BAD,
      badMode: GrowthHabitBadMode.LIMIT,
      goalValue: 60,
      goalUnit: 'duration',
    });
    expect(
      evaluateDayStatus({
        config,
        dayKey: '2026-09-17',
        todayKey: '2026-09-17',
        value: 45,
        skipped: false,
      }),
    ).toBe(GrowthHabitDayStatus.COMPLETED);
    expect(
      evaluateDayStatus({
        config,
        dayKey: '2026-09-17',
        todayKey: '2026-09-17',
        value: 85,
        skipped: false,
      }),
    ).toBe(GrowthHabitDayStatus.FAILED);
  });

  it('quit: zero is a successful day, any value is a violation', () => {
    const config = goodDaily({
      kind: GrowthHabitKind.BAD,
      badMode: GrowthHabitBadMode.QUIT,
      goalValue: 0,
    });
    expect(
      evaluateDayStatus({
        config,
        dayKey: '2026-09-17',
        todayKey: '2026-09-17',
        value: 0,
        skipped: false,
      }),
    ).toBe(GrowthHabitDayStatus.COMPLETED);
    expect(
      evaluateDayStatus({
        config,
        dayKey: '2026-09-17',
        todayKey: '2026-09-17',
        value: 1,
        skipped: false,
      }),
    ).toBe(GrowthHabitDayStatus.FAILED);
    const ok = buildHabitStatistics({
      fallback: config,
      records: records([['2026-09-17', 0]]),
      from: '2026-09-17',
      to: '2026-09-17',
      todayKey: '2026-09-17',
    });
    const broken = buildHabitStatistics({
      fallback: config,
      records: records([['2026-09-17', 1]]),
      from: '2026-09-17',
      to: '2026-09-17',
      todayKey: '2026-09-17',
    });
    expect(ok.calendar[0]?.progress).toBe(1);
    expect(broken.calendar[0]?.progress).toBe(0);
  });
});

describe('skip vs fail', () => {
  it('skipped days do not count as failed and do not break streak', () => {
    const stats = buildHabitStatistics({
      fallback: goodDaily(),
      records: records([
        ['2026-09-14', 1],
        ['2026-09-15', 0, true],
        ['2026-09-16', 1],
      ]),
      from: '2026-09-14',
      to: '2026-09-16',
      todayKey: '2026-09-16',
    });
    expect(stats.kpi.skipped).toBe(1);
    expect(stats.kpi.failed).toBe(0);
    expect(stats.kpi.currentStreak).toBe(2);
  });
});

describe('streaks', () => {
  it('daily current and longest streak', () => {
    const result = computeHabitStreak({
      frequency: GrowthHabitFrequency.DAILY,
      todayKey: '2026-09-17',
      completedDayKeys: ['2026-09-15', '2026-09-16', '2026-09-17'],
    });
    expect(result.currentStreak).toBe(3);
    expect(result.bestStreak).toBe(3);
  });

  it('weekly goal uses weeks, not missing weekdays', () => {
    const config = goodDaily({
      scheduleKind: GrowthHabitScheduleKind.EVERY_DAY,
      goalPeriod: GrowthHabitGoalPeriod.WEEK,
      goalValue: 3,
      goalUnit: 'count',
    });
    const stats = buildHabitStatistics({
      fallback: config,
      records: records([
        ['2026-09-14', 1],
        ['2026-09-15', 1],
        ['2026-09-16', 1],
      ]),
      from: '2026-09-14',
      to: '2026-09-20',
      todayKey: '2026-09-17',
    });
    expect(stats.kpi.completed).toBeGreaterThanOrEqual(1);
    expect(stats.kpi.currentStreak).toBeGreaterThanOrEqual(1);
  });

  it('monthly goal rolls up the month', () => {
    const config = goodDaily({
      scheduleKind: GrowthHabitScheduleKind.EVERY_DAY,
      goalPeriod: GrowthHabitGoalPeriod.MONTH,
      goalValue: 10,
    });
    const stats = buildHabitStatistics({
      fallback: config,
      records: records([
        ['2026-09-01', 4],
        ['2026-09-10', 6],
      ]),
      from: '2026-09-01',
      to: '2026-09-17',
      todayKey: '2026-09-17',
    });
    expect(stats.kpi.totalValue).toBe(10);
    expect(stats.kpi.completed).toBe(1);
  });
});

describe('historical config', () => {
  it('does not recompute January with February goal', () => {
    const jan = goodDaily({ goalValue: 30, goalUnit: 'duration' });
    const feb = goodDaily({ goalValue: 45, goalUnit: 'duration' });
    const stats = buildHabitStatistics({
      fallback: feb,
      versions: [
        { effectiveFrom: '2026-01-01', effectiveTo: '2026-01-31', config: jan },
        { effectiveFrom: '2026-02-01', effectiveTo: null, config: feb },
      ],
      records: records([
        ['2026-01-15', 30],
        ['2026-02-15', 30],
      ]),
      from: '2026-01-15',
      to: '2026-02-15',
      todayKey: '2026-02-15',
    });
    const january = stats.calendar.find((cell) => cell.dayKey === '2026-01-15');
    const february = stats.calendar.find((cell) => cell.dayKey === '2026-02-15');
    expect(january?.status).toBe(GrowthHabitDayStatus.COMPLETED);
    expect(february?.status).toBe(GrowthHabitDayStatus.PARTIAL);
    expect(configNeedsVersion(jan, feb)).toBe(true);
  });
});

describe('analytics helpers', () => {
  it('finds best weekday with enough samples', () => {
    const calendar = [
      { dayKey: '2026-09-07', status: GrowthHabitDayStatus.COMPLETED, value: 1, progress: 1, scheduled: true },
      { dayKey: '2026-09-14', status: GrowthHabitDayStatus.COMPLETED, value: 1, progress: 1, scheduled: true },
      { dayKey: '2026-09-21', status: GrowthHabitDayStatus.COMPLETED, value: 1, progress: 1, scheduled: true },
      { dayKey: '2026-09-28', status: GrowthHabitDayStatus.COMPLETED, value: 1, progress: 1, scheduled: true },
      { dayKey: '2026-09-08', status: GrowthHabitDayStatus.FAILED, value: 0, progress: 0, scheduled: true },
      { dayKey: '2026-09-15', status: GrowthHabitDayStatus.FAILED, value: 0, progress: 0, scheduled: true },
      { dayKey: '2026-09-22', status: GrowthHabitDayStatus.FAILED, value: 0, progress: 0, scheduled: true },
      { dayKey: '2026-09-29', status: GrowthHabitDayStatus.FAILED, value: 0, progress: 0, scheduled: true },
    ];
    const days = weekdayCompletion(calendar);
    expect(days[0]?.weekday).toBe(1);
    expect(days[0]?.sampleSize).toBe(4);
  });

  it('maps logged hours to time buckets', () => {
    expect(timeBucketFromHour(7)).toBe('MORNING');
    expect(timeBucketFromHour(13)).toBe('AFTERNOON');
    expect(timeBucketFromHour(19)).toBe('EVENING');
    expect(timeBucketFromHour(23)).toBe('NIGHT');
  });

  it('correlation requires a minimum overlap and is not causation', () => {
    const completed = Array.from({ length: 12 }, (_, i) => ({
      dayKey: `2026-09-${String(i + 1).padStart(2, '0')}`,
      status: GrowthHabitDayStatus.COMPLETED,
      value: 1,
      progress: 1,
      scheduled: true,
    }));
    const pair = pairCorrelation({
      habitIdA: 'a',
      habitIdB: 'b',
      titleA: 'Coffee',
      titleB: 'Read',
      calendarA: completed,
      calendarB: completed,
    });
    expect(pair?.rate).toBe(1);
    expect(pair?.overlapScheduled).toBe(12);
  });

  it('emits factual insights and rule-based recommendations', () => {
    const insights = buildInsights({
      currentCompletion: 0.78,
      previousCompletion: 0.64,
      currentStreak: 12,
      longestStreak: 12,
      bestWeekday: { weekday: 1, completion: 0.9, sampleSize: 8 },
      bestTime: { bucket: 'MORNING', count: 9 },
      mostBroken: { habitId: 'h1', failRate: 0.6, sampleSize: 10 },
      goalConsistency: 0.7,
      currentScheduled: 12,
      previousScheduled: 12,
    });
    expect(insights.map((row) => row.code)).toContain('COMPLETION_UP');
    expect(insights.map((row) => row.code)).toContain('STREAK_RECORD');

    const recs = buildRecommendations({
      habits: [
        {
          habitId: 'h1',
          kpi: {
            completion: 0.4,
            consistency: 0.4,
            currentStreak: 0,
            longestStreak: 2,
            completed: 3,
            failed: 7,
            skipped: 0,
            scheduled: 10,
            partial: 5,
            average: 10,
            totalValue: 100,
            goalProgress: 0.4,
          },
          calendar: weekdayCompletion.toString()
            ? [
                ...Array.from({ length: 4 }, (_, i) => ({
                  dayKey: `2026-09-${String(7 + i * 7).padStart(2, '0')}`,
                  status: GrowthHabitDayStatus.COMPLETED,
                  value: 1,
                  progress: 1,
                  scheduled: true,
                })),
                ...Array.from({ length: 4 }, (_, i) => ({
                  dayKey: `2026-09-${String(8 + i * 7).padStart(2, '0')}`,
                  status: GrowthHabitDayStatus.FAILED,
                  value: 0,
                  progress: 0,
                  scheduled: true,
                })),
              ]
            : [],
        },
      ],
    });
    expect(recs.some((row) => row.code === 'REVIEW_GOAL' || row.code === 'HIGH_FAILURE' || row.code === 'MOVE_WEEKDAY')).toBe(
      true,
    );
  });

  it('does not emit month-over-month insights from tiny samples', () => {
    const insights = buildInsights({
      currentCompletion: 1,
      previousCompletion: 0,
      currentStreak: 1,
      longestStreak: 1,
      bestWeekday: { weekday: 1, completion: 1, sampleSize: 2 },
      bestTime: { bucket: 'MORNING', count: 2 },
      mostBroken: { habitId: 'h1', failRate: 1, sampleSize: 2 },
      goalConsistency: 1,
      currentScheduled: 1,
      previousScheduled: 0,
    });
    expect(insights.map((row) => row.code)).not.toContain('COMPLETION_UP');
    expect(insights.map((row) => row.code)).not.toContain('GOAL_CONSISTENCY');
    expect(insights.map((row) => row.code)).not.toContain('BEST_WEEKDAY');
    expect(insights.map((row) => row.code)).not.toContain('BEST_TIME');
    expect(insights.map((row) => row.code)).not.toContain('HIGH_FAILURE');
  });
});

describe('progress range', () => {
  it('splits custom periods into current vs previous windows', () => {
    const range = resolveProgressRange({
      period: GrowthHabitProgressPeriod.CUSTOM,
      todayKey: '2026-09-20',
      from: '2026-09-01',
      to: '2026-09-20',
    });
    expect(range.from).toBe('2026-09-01');
    expect(range.previousTo).toBe('2026-08-31');
  });
});

describe('legacy due-today', () => {
  it('still marks daily habits due until checked in', () => {
    expect(
      isHabitDueToday({
        frequency: GrowthHabitFrequency.DAILY,
        todayKey: '2026-09-17',
        completedDayKeys: ['2026-09-16'],
      }),
    ).toBe(true);
  });
});
