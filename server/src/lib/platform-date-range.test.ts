import { PlatformDatePreset } from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

import { resolvePlatformDateRange } from './platform-date-range.js';

/** 14 Sep 2026 12:00 in Tashkent. */
const NOW = new Date('2026-09-14T07:00:00.000Z');

describe('resolvePlatformDateRange', () => {
  it('uses seven inclusive Tashkent days for LAST_7_DAYS', () => {
    const range = resolvePlatformDateRange({ preset: PlatformDatePreset.LAST_7_DAYS }, NOW);
    expect(range.from.toISOString()).toBe('2026-09-07T19:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-09-14T18:59:59.999Z');
    expect(range.label).toBe('7 kun');
  });

  it('uses thirty inclusive Tashkent days for LAST_30_DAYS', () => {
    const range = resolvePlatformDateRange({ preset: PlatformDatePreset.LAST_30_DAYS }, NOW);
    expect(range.from.toISOString()).toBe('2026-08-15T19:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-09-14T18:59:59.999Z');
  });

  it('keeps THIS_MONTH as the Tashkent calendar month', () => {
    const range = resolvePlatformDateRange({ preset: PlatformDatePreset.THIS_MONTH }, NOW);
    expect(range.from.toISOString()).toBe('2026-08-31T19:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-09-30T18:59:59.999Z');
  });

  it('parses a custom YYYY-MM-DD pair in Tashkent', () => {
    const range = resolvePlatformDateRange({ from: '2026-08-01', to: '2026-08-31' }, NOW);
    expect(range.preset).toBe(PlatformDatePreset.CUSTOM);
    expect(range.from.toISOString()).toBe('2026-07-31T19:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-08-31T18:59:59.999Z');
  });
});
