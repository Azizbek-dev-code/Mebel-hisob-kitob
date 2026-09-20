import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/prisma.js', () => ({ prisma: {} }));

const { deviceLabelFromUserAgent } = await import('./auth-sessions.service.js');

describe('deviceLabelFromUserAgent', () => {
  it('guesses browser and OS from a typical desktop UA', () => {
    expect(
      deviceLabelFromUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome · Windows');
  });

  it('falls back when the UA is missing', () => {
    expect(deviceLabelFromUserAgent(null)).toBe('Brauzer · Qurilma');
  });
});
