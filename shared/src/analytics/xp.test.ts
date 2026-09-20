import { describe, expect, it } from 'vitest';

import { PLATFORM_XP_EVENT_TYPES, platformXpReferenceKey, platformXpRule } from './xp.js';

describe('platformXpRule', () => {
  it('awards flat XP for a sale workflow, not a money amount', () => {
    expect(platformXpRule(PLATFORM_XP_EVENT_TYPES.SALE_CREATED)).toEqual({
      xp: 5,
      dailyLimit: 20,
    });
  });

  it('is idempotent per event via referenceKey', () => {
    expect(platformXpReferenceKey('sale_created', 'sale_1')).toBe('sale_created:sale_1');
  });
});
