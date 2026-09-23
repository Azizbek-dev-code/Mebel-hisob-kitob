import { describe, expect, it, vi } from 'vitest';

vi.mock('./telegram.config.js', () => ({
  getPublicAppUrl: () => 'https://www.mebelboshqaruv.uz',
}));

import { TELEGRAM_APP_PATHS, TELEGRAM_CTA_LABEL } from '@furniture-erp/shared';

import { absoluteAppUrl, ctaForNotification } from './telegram.cta.js';

describe('telegram CTA mapping', () => {
  it('maps a sale to the sale detail path without secrets', () => {
    const cta = ctaForNotification({
      type: 'SALE',
      title: 'Sale',
      message: 'x',
      accountType: 'BUSINESS',
      entityId: 'sale_123',
    });
    expect(cta.url).toBe('https://www.mebelboshqaruv.uz/sales/sale_123');
    expect(cta.label).toBe(TELEGRAM_CTA_LABEL.DETAIL);
    expect(cta.url).not.toMatch(/token|jwt|password/i);
    expect(cta.url.startsWith('https://')).toBe(true);
  });

  it('maps personal income to the personal income page', () => {
    const cta = ctaForNotification({
      type: 'PERSONAL_INCOME',
      title: 'Income',
      message: 'x',
      accountType: 'PERSONAL',
    });
    expect(cta.url).toBe(`https://www.mebelboshqaruv.uz${TELEGRAM_APP_PATHS.personalIncome}`);
  });

  it('maps summaries to dashboards/reports', () => {
    const personal = ctaForNotification({
      type: 'DAILY_SUMMARY',
      title: 'Day',
      message: 'x',
      accountType: 'PERSONAL',
    });
    expect(personal.url).toContain('/personal/dashboard');
    expect(personal.label).toBe(TELEGRAM_CTA_LABEL.SUMMARY);
  });

  it('rejects protocol-relative paths', () => {
    expect(absoluteAppUrl('//evil.test')).toBe('https://www.mebelboshqaruv.uz/');
  });
});
