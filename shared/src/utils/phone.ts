/**
 * Uzbekistan mobile phone normalization for customer identity.
 *
 * Canonical stored form: `+998XXXXXXXXX` (12 digits after +).
 * Accepts common operator-entered variants without inventing a second identity.
 */

/** Digits only. */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Normalise to `+998XXXXXXXXX` when the input is a plausible UZ mobile number.
 * Returns trimmed original when the number cannot be confidently normalised
 * (so validators can still reject too-short values).
 */
export function normalizeUzPhone(input: string): string {
  const trimmed = input.trim();
  const digits = digitsOnly(trimmed);

  if (!digits) return trimmed;

  // +998 XX XXX XX XX → 998 + 9 national digits
  if (digits.startsWith('998') && digits.length === 12) {
    return `+${digits}`;
  }

  // 0XX XXX XX XX (legacy national with leading 0)
  if (digits.startsWith('0') && digits.length === 10) {
    return `+998${digits.slice(1)}`;
  }

  // XX XXX XX XX (9-digit national mobile)
  if (digits.length === 9) {
    return `+998${digits}`;
  }

  // Already international without plus, or longer — keep last 9 after 998 if present
  if (digits.startsWith('998') && digits.length > 12) {
    return `+998${digits.slice(3, 12)}`;
  }

  return trimmed;
}

/** True when normalised form looks like +998 + 9 digits. */
export function isNormalizedUzMobile(phone: string): boolean {
  return /^\+998\d{9}$/.test(phone);
}

/**
 * Variants to try when looking up an existing customer by phone
 * (covers historical un-normalised rows until they are edited).
 */
export function phoneLookupVariants(input: string): string[] {
  const normalised = normalizeUzPhone(input);
  const digits = digitsOnly(input);
  const variants = new Set<string>([input.trim(), normalised]);

  if (digits.startsWith('998') && digits.length >= 12) {
    variants.add(`+${digits.slice(0, 12)}`);
    variants.add(digits.slice(0, 12));
  }
  if (digits.length === 9) {
    variants.add(digits);
    variants.add(`+998${digits}`);
    variants.add(`998${digits}`);
  }
  if (digits.startsWith('0') && digits.length === 10) {
    variants.add(digits);
    variants.add(`+998${digits.slice(1)}`);
  }

  return [...variants].filter(Boolean);
}
