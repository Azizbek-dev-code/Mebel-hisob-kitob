import { describe, expect, it } from 'vitest';

import { levelTitleKeyFor, unlocksForLevel } from './level-unlocks.js';

describe('level unlocks catalog', () => {
  it('returns next unlock above current level', () => {
    const at1 = unlocksForLevel(1);
    expect(at1.unlocked).toHaveLength(0);
    expect(at1.next?.key).toBe('ACHIEVEMENT_BADGE');
    expect(at1.next?.minLevel).toBe(5);

    const at12 = unlocksForLevel(12);
    expect(at12.unlocked.map((u) => u.key)).toEqual(['ACHIEVEMENT_BADGE', 'PROFILE_BADGE']);
    expect(at12.next?.key).toBe('CUSTOMIZATION');
  });

  it('maps soft titles by band', () => {
    expect(levelTitleKeyFor(1)).toBe('starter');
    expect(levelTitleKeyFor(12)).toBe('disciplined');
    expect(levelTitleKeyFor(50)).toBe('elite');
  });
});
