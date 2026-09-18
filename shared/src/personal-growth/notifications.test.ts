import { describe, expect, it } from 'vitest';

import { isGrowthNotifyPrefEnabled } from './notifications.js';

describe('growth notification prefs', () => {
  it('defaults to enabled when prefs missing', () => {
    expect(isGrowthNotifyPrefEnabled(null, 'FRIEND')).toBe(true);
  });

  it('respects explicit false', () => {
    expect(isGrowthNotifyPrefEnabled({ notifyFriend: false }, 'FRIEND')).toBe(false);
    expect(isGrowthNotifyPrefEnabled({ notifyFriend: false }, 'ACHIEVEMENT')).toBe(true);
  });
});
