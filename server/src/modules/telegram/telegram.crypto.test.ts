import { describe, expect, it } from 'vitest';

import { decryptTelegramSecret, encryptTelegramSecret } from './telegram.crypto.js';

describe('telegram secret encryption', () => {
  it('round-trips a bot token', () => {
    const token = '123456:TEST-TELEGRAM-BOT-TOKEN-DO-NOT-LEAK';
    const packed = encryptTelegramSecret(token);
    expect(packed).not.toContain(token);
    expect(decryptTelegramSecret(packed)).toBe(token);
  });
});
