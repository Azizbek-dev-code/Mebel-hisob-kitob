import { describe, expect, it } from 'vitest';

import {
  PlatformAccountDisplayStatus,
  PlatformAccountSource,
  StoreAccessStatus,
  SubscriptionStatus,
  WorkspaceStatus,
} from '../constants/enums.js';

import { platformAccountDisplayStatus } from './display-status.js';

describe('platformAccountDisplayStatus', () => {
  it('maps pending store applications to PENDING', () => {
    expect(
      platformAccountDisplayStatus({ source: PlatformAccountSource.PENDING_REQUEST }),
    ).toBe(PlatformAccountDisplayStatus.PENDING);
  });

  it('maps archived workspaces to CANCELLED', () => {
    expect(
      platformAccountDisplayStatus({
        source: PlatformAccountSource.WORKSPACE,
        workspaceStatus: WorkspaceStatus.ARCHIVED,
      }),
    ).toBe(PlatformAccountDisplayStatus.CANCELLED);
  });

  it('maps store access blocks ahead of subscription', () => {
    expect(
      platformAccountDisplayStatus({
        source: PlatformAccountSource.WORKSPACE,
        workspaceStatus: WorkspaceStatus.ACTIVE,
        accessStatus: StoreAccessStatus.MANUALLY_BLOCKED,
        subscription: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: '2099-01-01T00:00:00.000Z',
        },
      }),
    ).toBe(PlatformAccountDisplayStatus.BLOCKED);
  });

  it('maps an open trial to TRIAL', () => {
    expect(
      platformAccountDisplayStatus({
        source: PlatformAccountSource.WORKSPACE,
        workspaceStatus: WorkspaceStatus.ACTIVE,
        accessStatus: StoreAccessStatus.ACTIVE,
        subscription: {
          status: SubscriptionStatus.TRIAL,
          trialEndsAt: '2099-01-01T00:00:00.000Z',
          currentPeriodEnd: '2099-01-01T00:00:00.000Z',
        },
      }),
    ).toBe(PlatformAccountDisplayStatus.TRIAL);
  });

  it('maps pending SaaS payment to BLOCKED, not a new enum', () => {
    expect(
      platformAccountDisplayStatus({
        source: PlatformAccountSource.WORKSPACE,
        workspaceStatus: WorkspaceStatus.ACTIVE,
        accessStatus: StoreAccessStatus.ACTIVE,
        subscription: {
          status: SubscriptionStatus.PENDING_PAYMENT,
          currentPeriodEnd: '2099-01-01T00:00:00.000Z',
        },
      }),
    ).toBe(PlatformAccountDisplayStatus.BLOCKED);
  });
});
