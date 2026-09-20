import { describe, expect, it, vi } from 'vitest';

vi.mock('./telegram.config.js', () => ({
  getPublicAppUrl: () => 'https://balancy.space',
}));

import { formatTelegramNotification } from './telegram.notification.js';

describe('formatTelegramNotification', () => {
  it('prefixes business messages with the shop context', () => {
    const formatted = formatTelegramNotification({
      type: 'SALE',
      title: '🛒 Yangi sotuv',
      message: 'Mijoz: Ali\nSumma: 100',
      accountType: 'BUSINESS',
      accountName: 'Mebel do‘koni',
      businessType: 'FURNITURE',
      entityId: 'sale_1',
    });
    expect(formatted.text).toContain('🪑 Mebel do‘koni');
    expect(formatted.text).toContain('🛒 Yangi sotuv');
    expect(formatted.buttonUrl).toContain('/sales/sale_1');
  });

  it('prefixes personal messages with the personal account line', () => {
    const formatted = formatTelegramNotification({
      type: 'PERSONAL_INCOME',
      title: '💰 Yangi daromad',
      message: '500 000 so‘m',
      accountType: 'PERSONAL',
    });
    expect(formatted.text).toContain('🏠 Shaxsiy hisob');
    expect(formatted.keyboard.inline_keyboard[0]?.[0]?.url).toContain('/personal/income');
  });
});
