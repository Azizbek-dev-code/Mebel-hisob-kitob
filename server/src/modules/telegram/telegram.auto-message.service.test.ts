import { describe, expect, it, vi } from 'vitest';
import {
  TelegramAutoMessageAccountType,
  TelegramAutoMessageRecurrence,
} from '@furniture-erp/shared';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    telegramAutoMessage: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    telegramAutoMessageExecution: { create: vi.fn(), updateMany: vi.fn() },
    telegramAutomation: { findUnique: vi.fn(), update: vi.fn() },
    telegramConnection: { findMany: vi.fn(), findUnique: vi.fn() },
    workspace: { findUnique: vi.fn() },
  },
}));
vi.mock('../../services/audit.service.js', () => ({ recordAudit: vi.fn() }));
vi.mock('../personal-finance/ledger/personal-ledger.service.js', () => ({
  getPersonalSummary: vi.fn(),
}));
vi.mock('../personal-finance/planning/personal-planning.service.js', () => ({
  listPersonalBudgets: vi.fn(),
  listPersonalSavingGoals: vi.fn(),
}));
vi.mock('../personal-finance/growth/personal-growth-focus.service.js', () => ({
  getFocusStats: vi.fn(),
}));
vi.mock('../../services/customer-catalogue.service.js', () => ({
  getStoreDebtSummary: vi.fn(),
}));
vi.mock('../../repositories/inventory.repository.js', () => ({
  summarizeInventory: vi.fn(),
}));

import {
  assertAutoMessageResultKeys,
  getAutoMessageResultCatalog,
} from './telegram.auto-message.catalog.js';
import { composeAutoMessageText, renderAutoMessageTemplate } from './telegram.auto-message.template.js';
import {
  AUTO_MESSAGE_TEMPLATES,
  autoMessageIsDue,
  listAutoMessageTemplates,
  previewAutoMessage,
} from './telegram.auto-message.service.js';
import { computeNextRunAt, formatNextRunLabel } from './telegram.auto-message.next-run.js';
import { previewSampleResults } from './telegram.auto-message.resolver.js';
import { previewTelegramAutoMessageSchema } from './telegram.admin.validators.js';

describe('auto message catalog', () => {
  it('returns only Personal results for PERSONAL', () => {
    const catalog = getAutoMessageResultCatalog(TelegramAutoMessageAccountType.PERSONAL);
    expect(catalog.every((item) => item.accountType === 'PERSONAL')).toBe(true);
    expect(catalog.some((item) => item.key === 'balance')).toBe(true);
    expect(catalog.some((item) => item.key === 'sales')).toBe(false);
  });

  it('returns only Business results for BUSINESS', () => {
    const catalog = getAutoMessageResultCatalog(TelegramAutoMessageAccountType.BUSINESS);
    expect(catalog.every((item) => item.accountType === 'BUSINESS')).toBe(true);
    expect(catalog.some((item) => item.key === 'revenue')).toBe(true);
    expect(catalog.some((item) => item.key === 'balance')).toBe(false);
  });

  it('rejects Business keys in Personal message', () => {
    const result = assertAutoMessageResultKeys('PERSONAL', ['balance', 'sales']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.invalid).toContain('sales');
  });

  it('rejects Personal keys in Business message', () => {
    const result = assertAutoMessageResultKeys('BUSINESS', ['revenue', 'income']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.invalid).toContain('income');
  });

  it('rejects unknown keys', () => {
    const result = assertAutoMessageResultKeys('PERSONAL', ['not_a_real_metric']);
    expect(result.ok).toBe(false);
  });
});

describe('auto message templates', () => {
  it('exposes optional templates without scheduling them', () => {
    expect(AUTO_MESSAGE_TEMPLATES.length).toBeGreaterThan(0);
    expect(listAutoMessageTemplates('PERSONAL').every((t) => t.accountType === 'PERSONAL')).toBe(
      true,
    );
  });
});

describe('auto message preview schema', () => {
  it('accepts full form payload by stripping schedule fields', () => {
    const parsed = previewTelegramAutoMessageSchema.parse({
      title: 'Test',
      accountType: 'PERSONAL',
      messageBody: 'Hi {{balance}}',
      resultKeys: ['balance'],
      enabled: true,
      recurrence: 'EVERY_DAY',
      hour: 8,
      minute: 0,
      timezone: 'Asia/Tashkent',
      weekday: 1,
      monthDay: 1,
      startDate: null,
      thresholdConfig: null,
      ctaEnabled: false,
      ctaLabel: null,
      ctaPath: null,
    });
    expect(parsed.accountType).toBe('PERSONAL');
    expect(parsed.resultKeys).toEqual(['balance']);
    expect((parsed as { enabled?: boolean }).enabled).toBeUndefined();
  });

  it('preview uses sample data and shared composer', () => {
    const preview = previewAutoMessage({
      title: 'Tong',
      accountType: TelegramAutoMessageAccountType.PERSONAL,
      messageBody: '{{income}}',
      resultKeys: ['income'],
    });
    expect(preview.preview).toBe(true);
    expect(preview.text).toContain('PREVIEW');
    expect(preview.text).toContain('Income');
    expect(preview.unresolvedPlaceholders).toEqual([]);
  });
});

describe('auto message template', () => {
  it('renders placeholders and reports unresolved ones', () => {
    const results = previewSampleResults('PERSONAL', ['balance', 'income']);
    const rendered = renderAutoMessageTemplate('Hi\n{{balance}}\n{{missing}}', results);
    expect(rendered.text).toContain('Balance');
    expect(rendered.unresolvedPlaceholders).toContain('missing');
  });

  it('preserves result order when appending unused keys', () => {
    const results = previewSampleResults('PERSONAL', ['expense', 'balance']);
    const composed = composeAutoMessageText({
      title: 'Test',
      messageBody: 'Body only',
      results,
      previewBanner: true,
    });
    expect(composed.text).toContain('PREVIEW');
    const expenseIdx = composed.text.indexOf('Expense');
    const balanceIdx = composed.text.indexOf('Balance');
    expect(expenseIdx).toBeGreaterThan(-1);
    expect(balanceIdx).toBeGreaterThan(expenseIdx);
  });

  it('applies threshold message for HIGH band', () => {
    const results = [{ key: 'budget_usage', label: 'Budget Usage', rawValue: 90, formatted: '90%' }];
    const composed = composeAutoMessageText({
      title: 'Alert',
      messageBody: '{{budget_usage}}',
      results,
      thresholdConfig: {
        resultKey: 'budget_usage',
        high: 80,
        highMessage: 'Xarajatlar yuqori',
      },
    });
    expect(composed.text).toContain('Xarajatlar yuqori');
  });
});

describe('auto message recurrence', () => {
  const base = {
    hour: 8,
    minute: 0,
    timezone: 'Asia/Tashkent',
    weekday: null as number | null,
    monthDay: null as number | null,
    startDate: null as Date | null,
  };

  it('EVERY_DAY due at matching local time', () => {
    const now = new Date('2026-03-21T03:00:00.000Z');
    const due = autoMessageIsDue({ ...base, recurrence: TelegramAutoMessageRecurrence.EVERY_DAY }, now);
    expect(due.due).toBe(true);
    expect(due.dayKey).toBe('2026-03-21');
  });

  it('EVERY_WEEK requires weekday', () => {
    const saturday = new Date('2026-03-21T03:00:00.000Z');
    expect(
      autoMessageIsDue(
        { ...base, recurrence: TelegramAutoMessageRecurrence.EVERY_WEEK, weekday: 7 },
        saturday,
      ).due,
    ).toBe(false);

    const sunday = new Date('2026-03-22T03:00:00.000Z');
    expect(
      autoMessageIsDue(
        { ...base, recurrence: TelegramAutoMessageRecurrence.EVERY_WEEK, weekday: 7 },
        sunday,
      ).due,
    ).toBe(true);
  });

  it('EVERY_MONTH clamps day 31 to last day of month', () => {
    const april30 = new Date('2026-04-30T03:00:00.000Z');
    expect(
      autoMessageIsDue(
        { ...base, recurrence: TelegramAutoMessageRecurrence.EVERY_MONTH, monthDay: 31 },
        april30,
      ).due,
    ).toBe(true);
  });

  it('EVERY_15_DAYS fires on start and +15', () => {
    const start = new Date('2026-03-01T00:00:00.000Z');
    expect(
      autoMessageIsDue(
        {
          ...base,
          recurrence: TelegramAutoMessageRecurrence.EVERY_15_DAYS,
          startDate: start,
        },
        new Date('2026-03-01T03:00:00.000Z'),
      ).due,
    ).toBe(true);
    expect(
      autoMessageIsDue(
        {
          ...base,
          recurrence: TelegramAutoMessageRecurrence.EVERY_15_DAYS,
          startDate: start,
        },
        new Date('2026-03-16T03:00:00.000Z'),
      ).due,
    ).toBe(true);
    expect(
      autoMessageIsDue(
        {
          ...base,
          recurrence: TelegramAutoMessageRecurrence.EVERY_15_DAYS,
          startDate: start,
        },
        new Date('2026-03-02T03:00:00.000Z'),
      ).due,
    ).toBe(false);
  });

  it('ONE_TIME only on start date', () => {
    const start = new Date('2026-03-10T00:00:00.000Z');
    expect(
      autoMessageIsDue(
        { ...base, recurrence: TelegramAutoMessageRecurrence.ONE_TIME, startDate: start },
        new Date('2026-03-10T03:00:00.000Z'),
      ).due,
    ).toBe(true);
    expect(
      autoMessageIsDue(
        { ...base, recurrence: TelegramAutoMessageRecurrence.ONE_TIME, startDate: start },
        new Date('2026-03-11T03:00:00.000Z'),
      ).due,
    ).toBe(false);
  });

  it('wrong minute is not due', () => {
    expect(
      autoMessageIsDue(
        { ...base, recurrence: TelegramAutoMessageRecurrence.EVERY_DAY },
        new Date('2026-03-21T03:01:00.000Z'),
      ).due,
    ).toBe(false);
  });
});

describe('next run calculation', () => {
  it('computes next Asia/Tashkent daily fire after now', () => {
    // 2026-03-21 10:00 Tashkent = 05:00 UTC
    const now = new Date('2026-03-21T05:00:00.000Z');
    const next = computeNextRunAt(
      {
        enabled: true,
        recurrence: TelegramAutoMessageRecurrence.EVERY_DAY,
        hour: 21,
        minute: 0,
        timezone: 'Asia/Tashkent',
        weekday: null,
        monthDay: null,
        startDate: null,
      },
      now,
    );
    expect(next).toBe('2026-03-21T16:00:00.000Z');
    expect(formatNextRunLabel(next, 'Asia/Tashkent', now)).toBe('Bugun 21:00');
  });

  it('returns null when disabled', () => {
    expect(
      computeNextRunAt({
        enabled: false,
        recurrence: TelegramAutoMessageRecurrence.EVERY_DAY,
        hour: 8,
        minute: 0,
        timezone: 'Asia/Tashkent',
        weekday: null,
        monthDay: null,
        startDate: null,
      }),
    ).toBeNull();
  });
});
