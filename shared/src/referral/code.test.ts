import { describe, expect, it } from 'vitest';

import {
  REFERRAL_CODE_LENGTH,
  encodeReferralCode,
  isReferralCode,
  normalizeReferralCode,
} from './code.js';

describe('referral codes', () => {
  it('encodes random bytes, not email or username', () => {
    const a = encodeReferralCode(Uint8Array.from([1, 2, 3, 4, 5]));
    const b = encodeReferralCode(Uint8Array.from([9, 8, 7, 6, 5]));
    expect(a).toHaveLength(REFERRAL_CODE_LENGTH);
    expect(b).toHaveLength(REFERRAL_CODE_LENGTH);
    expect(a).not.toBe(b);
    expect(a.includes('@')).toBe(false);
    expect(isReferralCode(a)).toBe(true);
    expect(isReferralCode('azizbek')).toBe(false);
    expect(isReferralCode('USER@X.COM')).toBe(false);
  });

  it('normalizes pasted codes', () => {
    expect(normalizeReferralCode(' abx7k29q ')).toBe('ABX7K29Q');
  });
});
