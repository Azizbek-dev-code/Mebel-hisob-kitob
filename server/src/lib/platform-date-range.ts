import { PlatformDatePreset } from '@furniture-erp/shared';

import {
  addZonedDays,
  addZonedMonths,
  startOfZonedDay,
  startOfZonedMonth,
  startOfZonedYear,
  zonedDayFromIsoDate,
  zonedParts,
  instantFromZoned,
} from './date-range.js';

const TZ = 'Asia/Tashkent';

export interface PlatformResolvedRange {
  from: Date;
  to: Date;
  label: string;
  preset: string;
}

function endOfZonedDayInclusive(instant: Date): Date {
  const nextStart = addZonedDays(startOfZonedDay(instant, TZ), TZ, 1);
  return new Date(nextStart.getTime() - 1);
}

function addZonedCalendarMonths(instant: Date, months: number): Date {
  const { year, month, day } = zonedParts(instant, TZ);
  return instantFromZoned({ year, month: month + months, day }, TZ);
}

function thisMonthRange(now: Date): PlatformResolvedRange {
  const from = startOfZonedMonth(now, TZ);
  const to = new Date(addZonedMonths(from, TZ, 1).getTime() - 1);
  return { from, to, label: 'Shu oy', preset: PlatformDatePreset.THIS_MONTH };
}

export function resolvePlatformDateRange(
  query: { from?: string; to?: string; preset?: string },
  now = new Date(),
): PlatformResolvedRange {
  if (query.from && query.to) {
    const from = zonedDayFromIsoDate(query.from.slice(0, 10), TZ);
    const to = endOfZonedDayInclusive(zonedDayFromIsoDate(query.to.slice(0, 10), TZ));
    return { from, to, label: 'Custom', preset: PlatformDatePreset.CUSTOM };
  }

  const preset = query.preset ?? PlatformDatePreset.THIS_MONTH;

  if (preset === PlatformDatePreset.LAST_7_DAYS) {
    const to = endOfZonedDayInclusive(now);
    const from = startOfZonedDay(addZonedDays(now, TZ, -6), TZ);
    return { from, to, label: '7 kun', preset };
  }
  if (preset === PlatformDatePreset.LAST_30_DAYS) {
    const to = endOfZonedDayInclusive(now);
    const from = startOfZonedDay(addZonedDays(now, TZ, -29), TZ);
    return { from, to, label: '30 kun', preset };
  }
  if (preset === PlatformDatePreset.LAST_3_MONTHS) {
    const to = endOfZonedDayInclusive(now);
    const from = startOfZonedDay(addZonedCalendarMonths(now, -3), TZ);
    return { from, to, label: '3 oy', preset };
  }
  if (preset === PlatformDatePreset.LAST_6_MONTHS) {
    const to = endOfZonedDayInclusive(now);
    const from = startOfZonedDay(addZonedCalendarMonths(now, -6), TZ);
    return { from, to, label: '6 oy', preset };
  }
  if (preset === PlatformDatePreset.LAST_YEAR) {
    const to = endOfZonedDayInclusive(now);
    const from = startOfZonedDay(addZonedCalendarMonths(now, -12), TZ);
    return { from, to, label: '1 yil', preset };
  }
  if (preset === PlatformDatePreset.LAST_MONTH) {
    const thisMonth = startOfZonedMonth(now, TZ);
    const from = addZonedMonths(thisMonth, TZ, -1);
    const to = new Date(thisMonth.getTime() - 1);
    return { from, to, label: "O'tgan oy", preset };
  }
  if (preset === PlatformDatePreset.THIS_YEAR) {
    const from = startOfZonedYear(now, TZ);
    const to = new Date(addZonedMonths(from, TZ, 12).getTime() - 1);
    return { from, to, label: 'Shu yil', preset };
  }

  return thisMonthRange(now);
}
