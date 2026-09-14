import { describe, expect, it } from 'vitest';

import { PersonalEntryType } from '../constants/enums.js';
import type { PersonalActivityItem } from '../types/personal-ledger.js';

import {
  PersonalHistoryPeriod,
  comparePersonalActivity,
  groupPersonalHistoryByCategory,
  groupPersonalHistoryByDay,
  personalHistoryRange,
} from './history.js';

const entry = (
  id: string,
  occurredAt: string,
  category = 'Oziq-ovqat',
  amount = 1_000,
): PersonalActivityItem => ({
  kind: 'ENTRY',
  occurredAt,
  createdAt: occurredAt,
  entry: {
    id,
    type: PersonalEntryType.EXPENSE,
    amount,
    occurredAt,
    note: null,
    status: 'ACTIVE' as const,
    wallet: { id: 'wal_1', name: 'Naqd', kind: 'CASH' },
    category: { id: `cat_${category}`, name: category, color: 'teal', kind: 'EXPENSE' },
    createdAt: occurredAt,
  },
});

describe('personalHistoryRange', () => {
  it('uses UTC week bounds Monday–Sunday for this week', () => {
    const range = personalHistoryRange(
      PersonalHistoryPeriod.THIS_WEEK,
      new Date('2026-09-13T15:00:00.000Z'),
    );
    expect(range).toEqual({ from: '2026-09-07', to: '2026-09-13' });
  });

  it('uses UTC month bounds for this month', () => {
    const range = personalHistoryRange(
      PersonalHistoryPeriod.THIS_MONTH,
      new Date('2026-09-13T15:00:00.000Z'),
    );
    expect(range).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('covers the previous UTC month', () => {
    const range = personalHistoryRange(
      PersonalHistoryPeriod.LAST_MONTH,
      new Date('2026-09-13T15:00:00.000Z'),
    );
    expect(range).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });
});

describe('history grouping', () => {
  it('keeps later activity first and groups adjacent days', () => {
    const items = [
      entry('e2', '2026-09-13T12:00:00.000Z'),
      entry('e1', '2026-09-12T12:00:00.000Z'),
    ].sort(comparePersonalActivity);
    const days = groupPersonalHistoryByDay(items);
    expect(days.map((row) => row.date)).toEqual(['2026-09-13', '2026-09-12']);
  });

  it('sums by category without treating transfers as the same group', () => {
    const transfer: PersonalActivityItem = {
      kind: 'TRANSFER',
      occurredAt: '2026-09-13T12:00:00.000Z',
      createdAt: '2026-09-13T12:00:00.000Z',
      transfer: {
        id: 'tr_1',
        amount: 2_000,
        occurredAt: '2026-09-13T12:00:00.000Z',
        note: null,
        status: 'ACTIVE',
        fromWallet: { id: 'wal_1', name: 'Naqd', kind: 'CASH' },
        toWallet: { id: 'wal_2', name: 'Karta', kind: 'CARD' },
        createdAt: '2026-09-13T12:00:00.000Z',
      },
    };
    const groups = groupPersonalHistoryByCategory([
      entry('e1', '2026-09-13T12:00:00.000Z', 'Oziq-ovqat', 5_000),
      transfer,
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.find((row) => row.key === 'TRANSFER')?.amountSom).toBe(2_000);
  });
});
