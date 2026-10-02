import { describe, expect, it } from 'vitest';

import { SmmProjectHealth, deriveSmmProjectHealth } from './smm.js';

describe('deriveSmmProjectHealth', () => {
  it('is ON_TRACK with healthy signals', () => {
    expect(
      deriveSmmProjectHealth({
        overdueTasks: 0,
        overdueAssignments: 0,
        contentProgressPct: 75,
        pendingClientApprovals: 0,
        daysUntilDeadline: 21,
        budgetPlanned: 5_000_000,
        contentCostTotal: 1_000_000,
      }),
    ).toBe(SmmProjectHealth.ON_TRACK);
  });

  it('is AT_RISK when overdue and deadline is within 7 days', () => {
    expect(
      deriveSmmProjectHealth({
        overdueTasks: 1,
        overdueAssignments: 0,
        contentProgressPct: 80,
        pendingClientApprovals: 0,
        daysUntilDeadline: 5,
        budgetPlanned: null,
        contentCostTotal: 0,
      }),
    ).toBe(SmmProjectHealth.AT_RISK);
  });

  it('is AT_RISK when deadline passed and content is incomplete', () => {
    expect(
      deriveSmmProjectHealth({
        overdueTasks: 0,
        overdueAssignments: 0,
        contentProgressPct: 60,
        pendingClientApprovals: 0,
        daysUntilDeadline: -2,
        budgetPlanned: null,
        contentCostTotal: 0,
      }),
    ).toBe(SmmProjectHealth.AT_RISK);
  });

  it('is NEEDS_ATTENTION when budget burn ≥ 90%', () => {
    expect(
      deriveSmmProjectHealth({
        overdueTasks: 0,
        overdueAssignments: 0,
        contentProgressPct: 90,
        pendingClientApprovals: 0,
        daysUntilDeadline: 30,
        budgetPlanned: 1_000_000,
        contentCostTotal: 900_000,
      }),
    ).toBe(SmmProjectHealth.NEEDS_ATTENTION);
  });

  it('is NEEDS_ATTENTION when deadline ≤14d and content <70%', () => {
    expect(
      deriveSmmProjectHealth({
        overdueTasks: 0,
        overdueAssignments: 0,
        contentProgressPct: 50,
        pendingClientApprovals: 0,
        daysUntilDeadline: 10,
        budgetPlanned: null,
        contentCostTotal: 0,
      }),
    ).toBe(SmmProjectHealth.NEEDS_ATTENTION);
  });
});
