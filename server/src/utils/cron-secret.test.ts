import { describe, expect, it } from 'vitest';

import { secretsMatch } from './cron-secret.js';

describe('secretsMatch', () => {
  it('rejects missing or different-length values', () => {
    expect(secretsMatch(undefined, 'abc')).toBe(false);
    expect(secretsMatch('abc', undefined)).toBe(false);
    expect(secretsMatch('ab', 'abc')).toBe(false);
  });

  it('accepts equal secrets', () => {
    expect(secretsMatch('cron-secret-value', 'cron-secret-value')).toBe(true);
    expect(secretsMatch('cron-secret-value', 'cron-secret-other')).toBe(false);
  });
});
