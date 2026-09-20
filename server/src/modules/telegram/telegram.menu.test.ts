import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    telegramMenuScreen: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('./telegram.config.js', () => ({
  getPublicAppUrl: () => 'https://balancy.space',
}));

import { TelegramMenuButtonAction } from '@furniture-erp/shared';

import { DEFAULT_TELEGRAM_MENU_SCREENS, defaultStartContent } from './telegram.menu.js';

describe('default Telegram menus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('welcome content has app + details buttons', () => {
    const content = defaultStartContent();
    expect(content.text).toContain('Balancy Space');
    expect(content.buttons?.some((button) => button.url === 'https://balancy.space')).toBe(true);
    expect(content.buttons?.some((button) => button.callbackData === 'tg:m:details')).toBe(true);
  });

  it('includes personal, business, furniture and carpet screens', () => {
    const slugs = DEFAULT_TELEGRAM_MENU_SCREENS.map((screen) => screen.slug);
    expect(slugs).toEqual(['details', 'personal', 'business', 'furniture', 'carpet', 'other-business']);
    const business = DEFAULT_TELEGRAM_MENU_SCREENS.find((screen) => screen.slug === 'business');
    expect(business?.buttons.map((button) => button.targetSlug)).toEqual([
      'furniture',
      'carpet',
      'other-business',
      'details',
    ]);
    expect(
      DEFAULT_TELEGRAM_MENU_SCREENS.find((screen) => screen.slug === 'furniture')?.categoryKey,
    ).toBe('FURNITURE');
    expect(business?.buttons[0]?.action).toBe(TelegramMenuButtonAction.MENU);
  });
});
