import { DashboardGranularity, DateRangePreset } from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

import {
  addZonedDays,
  buildRangeBuckets,
  resolveDashboardRange,
  startOfZonedDay,
  startOfZonedWeek,
  zoneOffsetMinutes,
  zonedParts,
} from './date-range.js';

const TASHKENT = 'Asia/Tashkent';
const LONDON = 'Europe/London';

/** A Saturday morning in Tashkent: 07:00 local, still the previous UTC day's evening. */
const SATURDAY_MORNING = new Date('2026-08-08T02:00:00.000Z');

function iso(date: Date): string {
  return date.toISOString();
}

describe('zone offsets', () => {
  it('reads a fixed offset from the zone database', () => {
    expect(zoneOffsetMinutes(SATURDAY_MORNING, TASHKENT)).toBe(300);
  });

  it('treats a zone sitting on UTC as no offset at all', () => {
    expect(zoneOffsetMinutes(SATURDAY_MORNING, 'UTC')).toBe(0);
  });

  it('follows a daylight saving change rather than assuming the offset is fixed', () => {
    expect(zoneOffsetMinutes(new Date('2026-01-15T12:00:00.000Z'), LONDON)).toBe(0);
    expect(zoneOffsetMinutes(new Date('2026-06-15T12:00:00.000Z'), LONDON)).toBe(60);
  });
});

describe('day boundaries', () => {
  it('starts the day in the store, not in UTC', () => {
    // 02:00 UTC is already 07:00 in Tashkent, so the day began the previous evening.
    expect(iso(startOfZonedDay(SATURDAY_MORNING, TASHKENT))).toBe('2026-08-07T19:00:00.000Z');
  });

  it('keeps a late-evening sale in the store day it was made', () => {
    const lateEvening = new Date('2026-08-07T20:30:00.000Z');
    expect(zonedParts(lateEvening, TASHKENT)).toMatchObject({ year: 2026, month: 8, day: 8 });
    expect(iso(startOfZonedDay(lateEvening, TASHKENT))).toBe('2026-08-07T19:00:00.000Z');
  });

  it('adds a calendar day rather than 24 hours across a clock change', () => {
    // The Sunday the UK moves to BST is 23 hours long.
    const start = startOfZonedDay(new Date('2026-03-29T12:00:00.000Z'), LONDON);
    expect(iso(start)).toBe('2026-03-29T00:00:00.000Z');
    expect(iso(addZonedDays(start, LONDON, 1))).toBe('2026-03-29T23:00:00.000Z');
  });

  it('starts the week on Monday', () => {
    // 8 August 2026 is a Saturday; the week began on the 3rd.
    expect(iso(startOfZonedWeek(SATURDAY_MORNING, TASHKENT))).toBe('2026-08-02T19:00:00.000Z');
  });
});

describe('resolveDashboardRange', () => {
  it('resolves today as the store\u2019s own day, bucketed by hour', () => {
    const range = resolveDashboardRange(DateRangePreset.TODAY, {}, TASHKENT, SATURDAY_MORNING);

    expect(iso(range.from)).toBe('2026-08-07T19:00:00.000Z');
    expect(iso(range.to)).toBe('2026-08-08T19:00:00.000Z');
    expect(range.granularity).toBe(DashboardGranularity.HOUR);
    expect(range.label).toBe('8 August 2026');
  });

  it('resolves yesterday as the day before that', () => {
    const range = resolveDashboardRange(DateRangePreset.YESTERDAY, {}, TASHKENT, SATURDAY_MORNING);

    expect(iso(range.from)).toBe('2026-08-06T19:00:00.000Z');
    expect(iso(range.to)).toBe('2026-08-07T19:00:00.000Z');
    expect(range.label).toBe('7 August 2026');
  });

  it('resolves this week from Monday to Monday', () => {
    const range = resolveDashboardRange(DateRangePreset.THIS_WEEK, {}, TASHKENT, SATURDAY_MORNING);

    expect(iso(range.from)).toBe('2026-08-02T19:00:00.000Z');
    expect(iso(range.to)).toBe('2026-08-09T19:00:00.000Z');
    expect(range.granularity).toBe(DashboardGranularity.DAY);
    expect(range.label).toBe('3 – 9 August 2026');
  });

  it('resolves this month to the whole calendar month', () => {
    const range = resolveDashboardRange(DateRangePreset.THIS_MONTH, {}, TASHKENT, SATURDAY_MORNING);

    expect(iso(range.from)).toBe('2026-07-31T19:00:00.000Z');
    expect(iso(range.to)).toBe('2026-08-31T19:00:00.000Z');
    expect(range.granularity).toBe(DashboardGranularity.DAY);
    expect(range.label).toBe('August 2026');
  });

  it('resolves this year to twelve months', () => {
    const range = resolveDashboardRange(DateRangePreset.THIS_YEAR, {}, TASHKENT, SATURDAY_MORNING);

    expect(iso(range.from)).toBe('2025-12-31T19:00:00.000Z');
    expect(iso(range.to)).toBe('2026-12-31T19:00:00.000Z');
    expect(range.granularity).toBe(DashboardGranularity.MONTH);
    expect(range.label).toBe('2026');
  });

  it('reads a custom period as inclusive calendar dates in the store\u2019s zone', () => {
    const range = resolveDashboardRange(
      DateRangePreset.CUSTOM,
      { from: '2026-08-01', to: '2026-08-08' },
      TASHKENT,
      SATURDAY_MORNING,
    );

    expect(iso(range.from)).toBe('2026-07-31T19:00:00.000Z');
    // The end date is included, so the period runs to the end of the 8th.
    expect(iso(range.to)).toBe('2026-08-08T19:00:00.000Z');
    expect(range.granularity).toBe(DashboardGranularity.DAY);
    expect(range.label).toBe('1 – 8 August 2026');
  });

  it('bucket size follows the length of a custom period', () => {
    const oneDay = resolveDashboardRange(
      DateRangePreset.CUSTOM,
      { from: '2026-08-08', to: '2026-08-08' },
      TASHKENT,
      SATURDAY_MORNING,
    );
    const oneQuarter = resolveDashboardRange(
      DateRangePreset.CUSTOM,
      { from: '2026-01-01', to: '2026-08-08' },
      TASHKENT,
      SATURDAY_MORNING,
    );

    expect(oneDay.granularity).toBe(DashboardGranularity.HOUR);
    expect(oneQuarter.granularity).toBe(DashboardGranularity.MONTH);
  });

  it('falls back to this month when a custom period arrives without dates', () => {
    const range = resolveDashboardRange(DateRangePreset.CUSTOM, {}, TASHKENT, SATURDAY_MORNING);

    expect(range.preset).toBe(DateRangePreset.THIS_MONTH);
    expect(iso(range.from)).toBe('2026-07-31T19:00:00.000Z');
  });
});

describe('buildRangeBuckets', () => {
  it('covers a day with 24 contiguous hours', () => {
    const buckets = buildRangeBuckets(
      resolveDashboardRange(DateRangePreset.TODAY, {}, TASHKENT, SATURDAY_MORNING),
    );

    expect(buckets).toHaveLength(24);
    expect(buckets[0]?.label).toBe('00:00');
    expect(buckets[23]?.label).toBe('23:00');
    expect(iso(buckets[23]!.end)).toBe('2026-08-08T19:00:00.000Z');
  });

  it('covers a month with one bucket per day', () => {
    const buckets = buildRangeBuckets(
      resolveDashboardRange(DateRangePreset.THIS_MONTH, {}, TASHKENT, SATURDAY_MORNING),
    );

    expect(buckets).toHaveLength(31);
    expect(buckets[0]?.label).toBe('1 Aug');
    expect(buckets[30]?.label).toBe('31 Aug');
  });

  it('covers a year with one bucket per month', () => {
    const buckets = buildRangeBuckets(
      resolveDashboardRange(DateRangePreset.THIS_YEAR, {}, TASHKENT, SATURDAY_MORNING),
    );

    expect(buckets).toHaveLength(12);
    expect(buckets.map((bucket) => bucket.label)).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);
  });

  it('leaves no gap or overlap between buckets', () => {
    const buckets = buildRangeBuckets(
      resolveDashboardRange(DateRangePreset.THIS_WEEK, {}, TASHKENT, SATURDAY_MORNING),
    );

    buckets.forEach((bucket, index) => {
      const next = buckets[index + 1];
      if (next) expect(iso(bucket.end)).toBe(iso(next.start));
    });
  });
});
