import { describe, expect, it } from 'vitest';

import {
  expectedInviteeCount,
  groupTargetReached,
  isValidChallengeDuration,
  isValidTargetValue,
  pickFightWinner,
} from './challenges.js';

describe('challenge helpers', () => {
  it('validates duration and fight invite counts', () => {
    expect(isValidChallengeDuration(7)).toBe(true);
    expect(isValidChallengeDuration(0)).toBe(false);
    expect(expectedInviteeCount('FIGHT', 1)).toBe(true);
    expect(expectedInviteeCount('FIGHT', 2)).toBe(false);
    expect(expectedInviteeCount('GROUP', 2)).toBe(true);
    expect(expectedInviteeCount('GROUP', 1)).toBe(false);
  });

  it('requires target only for GROUP', () => {
    expect(isValidTargetValue('FIGHT', 'XP_GAINED', null)).toBe(true);
    expect(isValidTargetValue('GROUP', 'FOCUS_MINUTES', 600)).toBe(true);
    expect(isValidTargetValue('GROUP', 'FOCUS_MINUTES', null)).toBe(false);
  });

  it('picks clear fight winner and detects ties', () => {
    expect(
      pickFightWinner([
        { identityId: 'a', score: 10 },
        { identityId: 'b', score: 8 },
      ]),
    ).toBe('a');
    expect(
      pickFightWinner([
        { identityId: 'a', score: 5 },
        { identityId: 'b', score: 5 },
      ]),
    ).toBeNull();
  });

  it('sums group progress against target', () => {
    expect(groupTargetReached([{ score: 40 }, { score: 60 }], 100)).toBe(true);
    expect(groupTargetReached([{ score: 40 }, { score: 50 }], 100)).toBe(false);
  });
});
