import { describe, expect, it } from 'vitest';

import { PresenceVisibility } from '../constants/enums.js';

import { canSeePresence, isOnlineAt } from './privacy.js';

describe('isOnlineAt', () => {
  const now = new Date('2026-09-21T12:00:00.000Z');

  it('is online within the threshold and offline after it', () => {
    expect(isOnlineAt(new Date('2026-09-21T11:56:00.000Z'), now, 300)).toBe(true);
    expect(isOnlineAt(new Date('2026-09-21T11:54:00.000Z'), now, 300)).toBe(false);
  });

  it('treats a missing heartbeat as offline', () => {
    expect(isOnlineAt(null, now)).toBe(false);
  });
});

describe('canSeePresence', () => {
  it('lets the owner see their own status even when set to nobody', () => {
    expect(
      canSeePresence({
        visibility: PresenceVisibility.NOBODY,
        viewerIsSelf: true,
        viewerIsFriend: false,
      }),
    ).toBe(true);
  });

  it('hides status from everyone else when set to nobody', () => {
    expect(
      canSeePresence({
        visibility: PresenceVisibility.NOBODY,
        viewerIsSelf: false,
        viewerIsFriend: true,
      }),
    ).toBe(false);
  });

  it('defaults to friends-only', () => {
    expect(
      canSeePresence({ visibility: null, viewerIsSelf: false, viewerIsFriend: true }),
    ).toBe(true);
    expect(
      canSeePresence({ visibility: null, viewerIsSelf: false, viewerIsFriend: false }),
    ).toBe(false);
  });

  it('shows everyone when visibility is EVERYONE', () => {
    expect(
      canSeePresence({
        visibility: PresenceVisibility.EVERYONE,
        viewerIsSelf: false,
        viewerIsFriend: false,
      }),
    ).toBe(true);
  });
});
