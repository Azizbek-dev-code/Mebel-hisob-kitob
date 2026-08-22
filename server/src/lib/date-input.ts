/**
 * Parses API date inputs into Date instances.
 *
 * Calendar dates (`YYYY-MM-DD`) become noon UTC so a store in Asia/Tashkent
 * still lands on the intended civil day when displayed. Full ISO datetimes are
 * kept as-is.
 */
export function parseFlexibleDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yearText = '0', monthText = '1', dayText = '1'] = value.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parsed;
}

export function parseFlexibleDateOrNull(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return parseFlexibleDate(value) ?? null;
}
