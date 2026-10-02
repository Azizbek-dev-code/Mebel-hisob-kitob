import {
  SmmDashboardPeriodPreset,
  SmmFinanceChartPreset,
  SmmProjectHealth,
  deriveSmmProjectHealth,
} from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

import {
  resolveSmmDashboardRange,
  resolveSmmFinanceRange,
  zonedYmd,
} from './dashboard.service.js';

const TASHKENT = 'Asia/Tashkent';

/** Wednesday 2026-09-16 12:00 Tashkent (UTC+5) → 07:00Z */
const FIXED_NOW = new Date('2026-09-16T07:00:00.000Z');

describe('deriveSmmProjectHealth (via shared)', () => {
  it('returns ON_TRACK when signals are clean', () => {
    expect(
      deriveSmmProjectHealth({
        overdueTasks: 0,
        overdueAssignments: 0,
        contentProgressPct: 80,
        pendingClientApprovals: 0,
        daysUntilDeadline: 30,
        budgetPlanned: 1_000_000,
        contentCostTotal: 100_000,
      }),
    ).toBe(SmmProjectHealth.ON_TRACK);
  });

  it('returns AT_RISK when overdue and content is behind', () => {
    expect(
      deriveSmmProjectHealth({
        overdueTasks: 2,
        overdueAssignments: 0,
        contentProgressPct: 40,
        pendingClientApprovals: 0,
        daysUntilDeadline: 20,
        budgetPlanned: null,
        contentCostTotal: 0,
      }),
    ).toBe(SmmProjectHealth.AT_RISK);
  });

  it('returns NEEDS_ATTENTION for client approval backlog', () => {
    expect(
      deriveSmmProjectHealth({
        overdueTasks: 0,
        overdueAssignments: 0,
        contentProgressPct: 90,
        pendingClientApprovals: 3,
        daysUntilDeadline: 30,
        budgetPlanned: null,
        contentCostTotal: 0,
      }),
    ).toBe(SmmProjectHealth.NEEDS_ATTENTION);
  });
});

describe('resolveSmmDashboardRange', () => {
  it('resolves LAST_7_DAYS as today−6 through tomorrow start in Asia/Tashkent', () => {
    const range = resolveSmmDashboardRange(
      SmmDashboardPeriodPreset.LAST_7_DAYS,
      {},
      TASHKENT,
      FIXED_NOW,
    );

    expect(range.preset).toBe(SmmDashboardPeriodPreset.LAST_7_DAYS);
    expect(zonedYmd(range.from, TASHKENT)).toBe('2026-09-10');
    expect(zonedYmd(new Date(range.to.getTime() - 1), TASHKENT)).toBe('2026-09-16');
    // Exclusive end = start of 2026-09-17 Tashkent = 2026-09-16T19:00:00.000Z
    expect(range.to.toISOString()).toBe('2026-09-16T19:00:00.000Z');
    // Inclusive start = 2026-09-10 Tashkent = 2026-09-09T19:00:00.000Z
    expect(range.from.toISOString()).toBe('2026-09-09T19:00:00.000Z');
  });

  it('resolves THIS_MONTH from month start through next month in Asia/Tashkent', () => {
    const range = resolveSmmDashboardRange(
      SmmDashboardPeriodPreset.THIS_MONTH,
      {},
      TASHKENT,
      FIXED_NOW,
    );

    expect(range.preset).toBe(SmmDashboardPeriodPreset.THIS_MONTH);
    expect(zonedYmd(range.from, TASHKENT)).toBe('2026-09-01');
    expect(range.from.toISOString()).toBe('2026-08-31T19:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-09-30T19:00:00.000Z');
    expect(range.label.toLowerCase()).toContain('september');
  });

  it('resolves CUSTOM with inclusive calendar ends', () => {
    const range = resolveSmmDashboardRange(
      SmmDashboardPeriodPreset.CUSTOM,
      { from: '2026-09-01', to: '2026-09-05' },
      TASHKENT,
      FIXED_NOW,
    );

    expect(zonedYmd(range.from, TASHKENT)).toBe('2026-09-01');
    expect(zonedYmd(new Date(range.to.getTime() - 1), TASHKENT)).toBe('2026-09-05');
  });
});

describe('resolveSmmFinanceRange', () => {
  it('uses daily buckets for LAST_30_DAYS', () => {
    const range = resolveSmmFinanceRange(
      SmmFinanceChartPreset.LAST_30_DAYS,
      TASHKENT,
      FIXED_NOW,
    );
    expect(range.granularity).toBe('DAY');
    expect(zonedYmd(range.from, TASHKENT)).toBe('2026-08-18');
  });

  it('uses monthly buckets for LAST_3_MONTHS', () => {
    const range = resolveSmmFinanceRange(
      SmmFinanceChartPreset.LAST_3_MONTHS,
      TASHKENT,
      FIXED_NOW,
    );
    expect(range.granularity).toBe('MONTH');
    expect(zonedYmd(range.from, TASHKENT)).toBe('2026-06-16');
  });
});
