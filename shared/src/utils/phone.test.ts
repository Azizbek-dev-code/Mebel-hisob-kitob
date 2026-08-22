import { describe, expect, it } from 'vitest';

import {
  isNormalizedUzMobile,
  normalizeUzPhone,
  phoneLookupVariants,
} from './phone.js';

describe('normalizeUzPhone', () => {
  it('normalises +998 form', () => {
    expect(normalizeUzPhone('+998901234567')).toBe('+998901234567');
  });

  it('normalises 998 without plus', () => {
    expect(normalizeUzPhone('998901234567')).toBe('+998901234567');
  });

  it('normalises 9-digit national', () => {
    expect(normalizeUzPhone('901234567')).toBe('+998901234567');
  });

  it('normalises spaced input', () => {
    expect(normalizeUzPhone('+998 90 123 45 67')).toBe('+998901234567');
  });

  it('normalises leading-zero national', () => {
    expect(normalizeUzPhone('0901234567')).toBe('+998901234567');
  });
});

describe('isNormalizedUzMobile', () => {
  it('accepts canonical form', () => {
    expect(isNormalizedUzMobile('+998901234567')).toBe(true);
  });

  it('rejects short numbers', () => {
    expect(isNormalizedUzMobile('+99890')).toBe(false);
  });
});

describe('phoneLookupVariants', () => {
  it('includes common equivalents', () => {
    const variants = phoneLookupVariants('901234567');
    expect(variants).toContain('+998901234567');
    expect(variants).toContain('901234567');
  });
});
