import { DashboardGranularity, DateRangePreset } from '@furniture-erp/shared';

/**
 * Period arithmetic in a store's own timezone.
 *
 * "Today's sales" has to mean the day the cash desk is having, not the day the
 * server happens to be in. Every boundary here is therefore resolved against the
 * store's IANA zone rather than the process timezone or UTC.
 *
 * `Intl` already carries the zone database, so this needs no dependency. Offsets
 * are read from it per instant instead of being assumed fixed, which keeps a
 * store in a DST-observing zone correct even though the only zone in use today,
 * Asia/Tashkent, has no DST.
 */

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface ResolvedDateRange {
  preset: DateRangePreset;
  /** Inclusive start instant. */
  from: Date;
  /** Exclusive end instant. */
  to: Date;
  granularity: DashboardGranularity;
  timeZone: string;
  /** Ready-to-display description of the period. */
  label: string;
}

export interface RangeBucket {
  start: Date;
  /** Exclusive. */
  end: Date;
  label: string;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Stops a malformed range from generating an unbounded number of chart points. */
const MAX_BUCKETS = 800;

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();
const partsFormatters = new Map<string, Intl.DateTimeFormat>();
const labelFormatters = new Map<string, Intl.DateTimeFormat>();

function cached(
  store: Map<string, Intl.DateTimeFormat>,
  key: string,
  create: () => Intl.DateTimeFormat,
): Intl.DateTimeFormat {
  const existing = store.get(key);
  if (existing) return existing;

  const created = create();
  store.set(key, created);
  return created;
}

function labelFormatter(
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-GB',
): Intl.DateTimeFormat {
  const key = `${locale}|${timeZone}|${JSON.stringify(options)}`;
  return cached(labelFormatters, key, () =>
    new Intl.DateTimeFormat(locale, { timeZone, ...options }),
  );
}

/**
 * `Aug`, `Sep`, `Dec` — three letters every month.
 *
 * `en-GB` abbreviates September as "Sept", which makes one chart label wider
 * than the other eleven, so the US abbreviations are used for axis labels only.
 */
function shortMonthLabel(instant: Date, timeZone: string): string {
  return labelFormatter(timeZone, { month: 'short' }, 'en-US').format(instant);
}

/**
 * Minutes the zone is ahead of UTC at the given instant. `Asia/Tashkent` returns
 * 300 all year; `Europe/London` alternates between 0 and 60.
 */
export function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const formatter = cached(
    offsetFormatters,
    timeZone,
    () => new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'longOffset' }),
  );

  const name = formatter.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value;
  // A zone sitting exactly on UTC formats as a bare "GMT" with no offset to parse.
  const match = name ? /GMT([+-])(\d{2}):(\d{2})/.exec(name) : null;
  if (!match) return 0;

  const [, sign, hours = '0', minutes = '0'] = match;
  return (sign === '-' ? -1 : 1) * (Number(hours) * 60 + Number(minutes));
}

/** The wall-clock reading a person in `timeZone` would take at `instant`. */
export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const formatter = cached(
    partsFormatters,
    timeZone,
    () =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
  );

  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

/**
 * The instant at which the given wall-clock reading occurs in the zone.
 *
 * Out-of-range fields are normalised, so `day: 0` is the last day of the previous
 * month and `month: 13` is January of the next year — which is what makes the
 * period arithmetic below a one-liner in each case.
 *
 * The offset is applied twice because the first guess can land on the far side of
 * a DST transition, where a different offset applies.
 */
export function instantFromZoned(parts: Partial<ZonedParts>, timeZone: string): Date {
  const asUtc = Date.UTC(
    parts.year ?? 1970,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
  );

  const firstOffset = zoneOffsetMinutes(new Date(asUtc), timeZone);
  const candidate = asUtc - firstOffset * MINUTE_MS;
  const secondOffset = zoneOffsetMinutes(new Date(candidate), timeZone);

  return new Date(secondOffset === firstOffset ? candidate : asUtc - secondOffset * MINUTE_MS);
}

export function startOfZonedDay(instant: Date, timeZone: string): Date {
  const { year, month, day } = zonedParts(instant, timeZone);
  return instantFromZoned({ year, month, day }, timeZone);
}

export function addZonedDays(instant: Date, timeZone: string, days: number): Date {
  const { year, month, day, hour, minute } = zonedParts(instant, timeZone);
  return instantFromZoned({ year, month, day: day + days, hour, minute }, timeZone);
}

/** Weeks start on Monday: the Uzbek working week, and the one the sidebar's reports assume. */
export function startOfZonedWeek(instant: Date, timeZone: string): Date {
  const { year, month, day } = zonedParts(instant, timeZone);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return instantFromZoned({ year, month, day: day - daysSinceMonday }, timeZone);
}

export function startOfZonedMonth(instant: Date, timeZone: string): Date {
  const { year, month } = zonedParts(instant, timeZone);
  return instantFromZoned({ year, month, day: 1 }, timeZone);
}

export function addZonedMonths(instant: Date, timeZone: string, months: number): Date {
  const { year, month } = zonedParts(instant, timeZone);
  return instantFromZoned({ year, month: month + months, day: 1 }, timeZone);
}

export function startOfZonedYear(instant: Date, timeZone: string): Date {
  const { year } = zonedParts(instant, timeZone);
  return instantFromZoned({ year, month: 1, day: 1 }, timeZone);
}

/** Parses a `YYYY-MM-DD` calendar date as the start of that day in the zone. */
export function zonedDayFromIsoDate(isoDate: string, timeZone: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return instantFromZoned({ year, month, day }, timeZone);
}

function wholeDaysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/**
 * Chart resolution for a custom period. A single day reads best hour by hour, a
 * couple of months day by day, and anything longer only stays legible by month.
 */
function granularityForSpan(from: Date, to: Date): DashboardGranularity {
  const days = wholeDaysBetween(from, to);
  if (days <= 1) return DashboardGranularity.HOUR;
  if (days <= 62) return DashboardGranularity.DAY;
  return DashboardGranularity.MONTH;
}

function formatDayLabel(instant: Date, timeZone: string): string {
  return labelFormatter(timeZone, { day: 'numeric', month: 'long', year: 'numeric' }).format(
    instant,
  );
}

/** `3 – 9 August 2026`, dropping the parts both ends already share. */
function formatSpanLabel(from: Date, lastDay: Date, timeZone: string): string {
  const start = zonedParts(from, timeZone);
  const end = zonedParts(lastDay, timeZone);

  if (start.year === end.year && start.month === end.month && start.day === end.day) {
    return formatDayLabel(from, timeZone);
  }

  if (start.year === end.year && start.month === end.month) {
    const month = labelFormatter(timeZone, { month: 'long', year: 'numeric' }).format(lastDay);
    return `${start.day} – ${end.day} ${month}`;
  }

  if (start.year === end.year) {
    const startPart = labelFormatter(timeZone, { day: 'numeric', month: 'long' }).format(from);
    return `${startPart} – ${formatDayLabel(lastDay, timeZone)}`;
  }

  return `${formatDayLabel(from, timeZone)} – ${formatDayLabel(lastDay, timeZone)}`;
}

function labelFor(
  preset: DateRangePreset,
  from: Date,
  to: Date,
  timeZone: string,
): string {
  // The period end is exclusive, so the last day it covers is a millisecond earlier.
  const lastDay = new Date(to.getTime() - 1);

  switch (preset) {
    case DateRangePreset.TODAY:
    case DateRangePreset.YESTERDAY:
      return formatDayLabel(from, timeZone);
    case DateRangePreset.THIS_MONTH:
    case DateRangePreset.LAST_MONTH:
      return labelFormatter(timeZone, { month: 'long', year: 'numeric' }).format(from);
    case DateRangePreset.THIS_YEAR:
      return labelFormatter(timeZone, { year: 'numeric' }).format(from);
    default:
      return formatSpanLabel(from, lastDay, timeZone);
  }
}

export interface CustomRangeInput {
  /** `YYYY-MM-DD`, inclusive. */
  from?: string;
  /** `YYYY-MM-DD`, inclusive. */
  to?: string;
}

/**
 * Turns a preset — plus a custom pair of calendar dates — into the half-open
 * instant range every dashboard query is scoped by.
 *
 * A custom range missing either end falls back to the current month rather than
 * throwing: the request validator has already rejected that combination, and a
 * dashboard is not worth a 500 if a new caller ever gets it wrong.
 */
export function resolveDashboardRange(
  preset: DateRangePreset,
  custom: CustomRangeInput,
  timeZone: string,
  now: Date = new Date(),
): ResolvedDateRange {
  const build = (
    from: Date,
    to: Date,
    granularity: DashboardGranularity,
    resolvedPreset: DateRangePreset = preset,
  ): ResolvedDateRange => ({
    preset: resolvedPreset,
    from,
    to,
    granularity,
    timeZone,
    label: labelFor(resolvedPreset, from, to, timeZone),
  });

  switch (preset) {
    case DateRangePreset.TODAY: {
      const from = startOfZonedDay(now, timeZone);
      return build(from, addZonedDays(from, timeZone, 1), DashboardGranularity.HOUR);
    }

    case DateRangePreset.YESTERDAY: {
      const to = startOfZonedDay(now, timeZone);
      return build(addZonedDays(to, timeZone, -1), to, DashboardGranularity.HOUR);
    }

    case DateRangePreset.THIS_WEEK: {
      const from = startOfZonedWeek(now, timeZone);
      return build(from, addZonedDays(from, timeZone, 7), DashboardGranularity.DAY);
    }

    case DateRangePreset.LAST_MONTH: {
      const thisMonthStart = startOfZonedMonth(now, timeZone);
      const from = addZonedMonths(thisMonthStart, timeZone, -1);
      return build(from, thisMonthStart, DashboardGranularity.DAY);
    }

    case DateRangePreset.THIS_YEAR: {
      const from = startOfZonedYear(now, timeZone);
      return build(from, addZonedMonths(from, timeZone, 12), DashboardGranularity.MONTH);
    }

    case DateRangePreset.CUSTOM: {
      if (!custom.from || !custom.to) break;

      const from = zonedDayFromIsoDate(custom.from, timeZone);
      // The caller names an inclusive last day; the range runs to the end of it.
      const to = addZonedDays(zonedDayFromIsoDate(custom.to, timeZone), timeZone, 1);
      return build(from, to, granularityForSpan(from, to));
    }

    default:
      break;
  }

  const from = startOfZonedMonth(now, timeZone);
  return build(
    from,
    addZonedMonths(from, timeZone, 1),
    DashboardGranularity.DAY,
    DateRangePreset.THIS_MONTH,
  );
}

/** The chart's x-axis: one contiguous, non-overlapping bucket per point. */
export function buildRangeBuckets(range: ResolvedDateRange): RangeBucket[] {
  const { granularity, timeZone } = range;

  const advance = (instant: Date): Date => {
    switch (granularity) {
      case DashboardGranularity.HOUR:
        return new Date(instant.getTime() + HOUR_MS);
      case DashboardGranularity.MONTH:
        return addZonedMonths(instant, timeZone, 1);
      default:
        return addZonedDays(instant, timeZone, 1);
    }
  };

  const format = (instant: Date): string => {
    switch (granularity) {
      case DashboardGranularity.HOUR:
        return labelFormatter(timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
          .format(instant);
      case DashboardGranularity.MONTH:
        return shortMonthLabel(instant, timeZone);
      default:
        return `${zonedParts(instant, timeZone).day} ${shortMonthLabel(instant, timeZone)}`;
    }
  };

  const buckets: RangeBucket[] = [];
  let cursor = range.from;

  while (cursor < range.to && buckets.length < MAX_BUCKETS) {
    const end = advance(cursor);
    // A zone arithmetic result that failed to move would spin forever.
    if (end <= cursor) break;

    buckets.push({ start: cursor, end: end > range.to ? range.to : end, label: format(cursor) });
    cursor = end;
  }

  return buckets;
}
