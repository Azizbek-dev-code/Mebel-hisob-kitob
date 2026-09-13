import { DateRangePreset } from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

import { periodToInclusiveRange } from './period-range';

const NOON_TASHKENT = new Date('2026-09-13T12:00:00+05:00');

describe('periodToInclusiveRange', () => {
  it('maps YESTERDAY to a single calendar day', () => {
    expect(
      periodToInclusiveRange({ preset: DateRangePreset.YESTERDAY }, NOON_TASHKENT),
    ).toEqual({ from: '2026-09-12', to: '2026-09-12' });
  });

  it('maps LAST_MONTH to the previous calendar month', () => {
    expect(
      periodToInclusiveRange({ preset: DateRangePreset.LAST_MONTH }, NOON_TASHKENT),
    ).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('maps THIS_MONTH so the finances page can query Postgres', () => {
    expect(
      periodToInclusiveRange({ preset: DateRangePreset.THIS_MONTH }, NOON_TASHKENT),
    ).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });
});
