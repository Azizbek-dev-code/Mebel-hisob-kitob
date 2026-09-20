import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/prisma.js', () => ({ prisma: { telegramAutomation: {}, telegramConnection: {}, telegramAutomationLog: {}, workspace: { findUnique: vi.fn() } } }));
vi.mock('../../services/audit.service.js', () => ({ recordAudit: vi.fn() }));

import { TelegramAutomationKind } from '@furniture-erp/shared';

import { automationIsDueForTest } from './telegram.automation.service.js';

describe('telegram automation due window', () => {
  const timezone = 'Asia/Tashkent';

  it('fires once per local day at the configured hour', () => {
    const now = new Date('2026-09-21T03:00:00.000Z'); // 08:00 Tashkent
    const due = automationIsDueForTest(
      {
        kind: TelegramAutomationKind.PERSONAL_MORNING,
        hour: 8,
        minute: 0,
        timezone,
        weekday: null,
        monthDay: null,
        lastRunLocalKey: null,
      },
      now,
    );
    expect(due.due).toBe(true);
    expect(due.dayKey).toBe('2026-09-21');
  });

  it('does not double-send the same local key', () => {
    const now = new Date('2026-09-21T03:00:00.000Z');
    const due = automationIsDueForTest(
      {
        kind: TelegramAutomationKind.BUSINESS_MORNING,
        hour: 8,
        minute: 0,
        timezone,
        weekday: null,
        monthDay: null,
        lastRunLocalKey: '2026-09-21',
      },
      now,
    );
    expect(due.due).toBe(false);
  });

  it('weekly automations wait for the configured weekday', () => {
    const monday = new Date('2026-09-21T15:00:00.000Z'); // 20:00 Tashkent Monday
    const due = automationIsDueForTest(
      {
        kind: TelegramAutomationKind.PERSONAL_WEEKLY,
        hour: 20,
        minute: 0,
        timezone,
        weekday: 1,
        monthDay: null,
        lastRunLocalKey: null,
      },
      monday,
    );
    expect(due.due).toBe(true);
  });
});
