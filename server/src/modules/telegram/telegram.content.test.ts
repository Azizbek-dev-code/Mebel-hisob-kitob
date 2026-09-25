import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendTelegramMessage, sendTelegramPhoto } = vi.hoisted(() => ({
  sendTelegramMessage: vi.fn(),
  sendTelegramPhoto: vi.fn(),
}));

vi.mock('./telegram.service.js', () => ({
  sendTelegramMessage,
  sendTelegramPhoto,
}));

import { sendTelegramContent } from './telegram.content.js';

describe('sendTelegramContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendTelegramMessage.mockResolvedValue({ ok: true });
    sendTelegramPhoto.mockResolvedValue({ ok: true });
  });

  it('sends text with an optional URL button', async () => {
    await sendTelegramContent('55', {
      text: 'Hello',
      buttonText: 'Open',
      buttonUrl: 'https://balancy.space',
    });
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      '55',
      'Hello',
      { inline_keyboard: [[{ text: 'Open', url: 'https://balancy.space' }]] },
      undefined,
    );
  });

  it('sends a photo caption when image + short text are present', async () => {
    await sendTelegramContent('55', {
      text: 'Welcome',
      imageUrl: 'https://cdn.example.com/a.jpg',
      buttonText: 'Go',
      buttonUrl: 'https://balancy.space',
    });
    expect(sendTelegramPhoto).toHaveBeenCalledWith(
      '55',
      'https://cdn.example.com/a.jpg',
      'Welcome',
      { inline_keyboard: [[{ text: 'Go', url: 'https://balancy.space' }]] },
      undefined,
    );
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });
});
