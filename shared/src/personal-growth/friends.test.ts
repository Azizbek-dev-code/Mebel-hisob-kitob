import { describe, expect, it } from 'vitest';

import { friendshipPairKey, isSelfFriendRequest } from './friends.js';

describe('friendshipPairKey', () => {
  it('is order-independent', () => {
    expect(friendshipPairKey('a', 'b')).toBe(friendshipPairKey('b', 'a'));
    expect(friendshipPairKey('idn_2', 'idn_1')).toBe('idn_1:idn_2');
  });

  it('detects self requests', () => {
    expect(isSelfFriendRequest('x', 'x')).toBe(true);
    expect(isSelfFriendRequest('x', 'y')).toBe(false);
  });
});
