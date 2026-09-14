/** Crockford-like alphabet: no 0/O/1/I/U so codes are not emails or names. */
export const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_LENGTH = 8;
export const REFERRAL_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

export function isReferralCode(value: unknown): value is string {
  return typeof value === 'string' && REFERRAL_CODE_PATTERN.test(value);
}

export function normalizeReferralCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Encodes 5 random bytes into an 8-character referral code. */
export function encodeReferralCode(bytes: Uint8Array): string {
  if (bytes.length < 5) {
    throw new Error('Referral code needs 5 random bytes');
  }
  let bits = 0n;
  for (let i = 0; i < 5; i += 1) {
    bits = (bits << 8n) | BigInt(bytes[i] ?? 0);
  }
  let out = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    out = REFERRAL_CODE_ALPHABET[Number(bits & 31n)] + out;
    bits >>= 5n;
  }
  return out;
}
