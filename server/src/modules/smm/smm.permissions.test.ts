import {
  SmmContentStatus,
  SmmProjectMemberRole,
  UserRole,
  canTransitionSmmContentStatus,
} from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

import {
  CLIENT_VISIBLE_CONTENT_STATUSES,
  assertCanViewCompetitors,
  assertCanViewCosts,
  assertNotClient,
  buildProjectAccess,
  canClientSeeContentStatus,
  clientContentStatusWhere,
  isClientMemberRole,
  isStoreSmmAdmin,
  shouldRestrictActivityFeed,
} from './smm.permissions.js';
import { ApiError } from '../../utils/api-error.js';

describe('smm.permissions', () => {
  it('recognises store and platform admins', () => {
    expect(isStoreSmmAdmin(UserRole.ADMIN)).toBe(true);
    expect(isStoreSmmAdmin(UserRole.PLATFORM_ADMIN)).toBe(true);
    expect(isStoreSmmAdmin(UserRole.WORKER)).toBe(false);
  });

  it('gates CLIENT member role', () => {
    expect(isClientMemberRole(SmmProjectMemberRole.CLIENT)).toBe(true);
    expect(isClientMemberRole(SmmProjectMemberRole.EDITOR)).toBe(false);
  });

  it('limits client-visible content statuses', () => {
    expect(CLIENT_VISIBLE_CONTENT_STATUSES).toContain(SmmContentStatus.CLIENT_REVIEW);
    expect(CLIENT_VISIBLE_CONTENT_STATUSES).toContain(SmmContentStatus.APPROVED);
    expect(CLIENT_VISIBLE_CONTENT_STATUSES).not.toContain(SmmContentStatus.IDEA);
    expect(CLIENT_VISIBLE_CONTENT_STATUSES).not.toContain(SmmContentStatus.INTERNAL_REVIEW);

    expect(canClientSeeContentStatus(SmmContentStatus.PUBLISHED)).toBe(true);
    expect(canClientSeeContentStatus(SmmContentStatus.BRIEF)).toBe(false);
  });

  it('builds access context for clients vs members', () => {
    const client = buildProjectAccess({
      storeId: 'store_1',
      userId: 'user_1',
      userRole: UserRole.WORKER,
      projectId: 'proj_1',
      memberRole: SmmProjectMemberRole.CLIENT,
    });
    expect(client.isClient).toBe(true);
    expect(client.isAdmin).toBe(false);
    expect(shouldRestrictActivityFeed(client)).toBe(true);

    const admin = buildProjectAccess({
      storeId: 'store_1',
      userId: 'user_2',
      userRole: UserRole.ADMIN,
      projectId: 'proj_1',
      memberRole: null,
    });
    expect(admin.isAdmin).toBe(true);
    expect(admin.isClient).toBe(false);
  });

  it('blocks clients from competitors and costs', () => {
    const client = buildProjectAccess({
      storeId: 'store_1',
      userId: 'user_1',
      userRole: UserRole.WORKER,
      projectId: 'proj_1',
      memberRole: SmmProjectMemberRole.CLIENT,
    });

    expect(() => assertNotClient(client)).toThrow(ApiError);
    expect(() => assertCanViewCompetitors(client)).toThrow(ApiError);
    expect(() => assertCanViewCosts(client)).toThrow(ApiError);
  });

  it('allows non-clients through restricted gates', () => {
    const editor = buildProjectAccess({
      storeId: 'store_1',
      userId: 'user_1',
      userRole: UserRole.WORKER,
      projectId: 'proj_1',
      memberRole: SmmProjectMemberRole.EDITOR,
    });

    expect(() => assertNotClient(editor)).not.toThrow();
    expect(() => assertCanViewCompetitors(editor)).not.toThrow();
    expect(() => assertCanViewCosts(editor)).not.toThrow();
  });

  it('exposes a prisma-ready client status filter', () => {
    const filter = clientContentStatusWhere();
    expect(filter.status.in).toEqual([...CLIENT_VISIBLE_CONTENT_STATUSES]);
  });
});

describe('canTransitionSmmContentStatus (shared helper)', () => {
  it('allows same-status no-ops', () => {
    expect(
      canTransitionSmmContentStatus(SmmContentStatus.BRIEF, SmmContentStatus.BRIEF),
    ).toBe(true);
  });

  it('allows forward pipeline moves', () => {
    expect(
      canTransitionSmmContentStatus(SmmContentStatus.IDEA, SmmContentStatus.PLANNED),
    ).toBe(true);
    expect(
      canTransitionSmmContentStatus(
        SmmContentStatus.CLIENT_REVIEW,
        SmmContentStatus.APPROVED,
      ),
    ).toBe(true);
  });

  it('rejects illegal jumps', () => {
    expect(
      canTransitionSmmContentStatus(SmmContentStatus.IDEA, SmmContentStatus.PUBLISHED),
    ).toBe(false);
    expect(
      canTransitionSmmContentStatus(SmmContentStatus.ARCHIVED, SmmContentStatus.IDEA),
    ).toBe(false);
  });
});
