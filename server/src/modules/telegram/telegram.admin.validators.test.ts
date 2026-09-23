import { describe, expect, it } from 'vitest';

import {
  createTelegramBroadcastSchema,
  updateTelegramStartMessageSchema,
} from './telegram.admin.validators.js';

describe('updateTelegramStartMessageSchema', () => {
  it('accepts null optional fields from the admin composer contract', () => {
    const parsed = updateTelegramStartMessageSchema.parse({
      text: 'Salom',
      mediaKind: 'NONE',
      imageUrl: null,
      buttonText: null,
      buttonUrl: null,
      buttons: [
        {
          text: '🚀 Dasturga kirish',
          action: 'URL',
          url: 'https://balancy.space',
        },
        {
          text: '📚 Batafsil',
          action: 'MENU',
          targetSlug: 'details',
        },
      ],
    });

    expect(parsed.text).toBe('Salom');
    expect(parsed.imageUrl).toBeUndefined();
    expect(parsed.buttonText).toBeUndefined();
    expect(parsed.buttonUrl).toBeUndefined();
    expect(parsed.buttons).toHaveLength(2);
    expect(parsed.buttons?.[1]?.targetSlug).toBe('details');
  });

  it('accepts empty strings for optional fields', () => {
    const parsed = updateTelegramStartMessageSchema.parse({
      text: 'Matn',
      imageUrl: '',
      buttonText: '   ',
      buttonUrl: '',
    });
    expect(parsed.imageUrl).toBeUndefined();
    expect(parsed.buttonText).toBeUndefined();
    expect(parsed.buttonUrl).toBeUndefined();
  });

  it('rejects a button text without a matching URL', () => {
    const result = updateTelegramStartMessageSchema.safeParse({
      text: 'Matn',
      imageUrl: null,
      buttonText: 'Kirish',
      buttonUrl: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('buttonUrl'))).toBe(true);
    }
  });

  it('rejects an invalid button URL', () => {
    const result = updateTelegramStartMessageSchema.safeParse({
      text: 'Matn',
      buttonText: 'Kirish',
      buttonUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('createTelegramBroadcastSchema', () => {
  it('accepts null optional rich-content fields', () => {
    const parsed = createTelegramBroadcastSchema.parse({
      text: 'Broadcast',
      mediaKind: 'NONE',
      imageUrl: null,
      buttonText: null,
      buttonUrl: null,
      sendNow: true,
    });
    expect(parsed.imageUrl).toBeUndefined();
    expect(parsed.buttonText).toBeUndefined();
    expect(parsed.buttonUrl).toBeUndefined();
  });
});
