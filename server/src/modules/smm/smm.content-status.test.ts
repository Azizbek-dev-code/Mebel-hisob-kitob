import {
  SmmContentStatus,
  canTransitionSmmContentStatus,
  SMM_CONTENT_STATUS_TRANSITIONS,
  smmProgressGroupForStatus,
  SmmProgressStatusGroup,
} from '@furniture-erp/shared';
import { describe, expect, it } from 'vitest';

describe('smm content status transitions', () => {
  it('covers every status in the transition map', () => {
    for (const status of Object.values(SmmContentStatus)) {
      expect(SMM_CONTENT_STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });

  it('keeps ARCHIVED terminal', () => {
    expect(SMM_CONTENT_STATUS_TRANSITIONS[SmmContentStatus.ARCHIVED]).toEqual([]);
    expect(
      canTransitionSmmContentStatus(SmmContentStatus.ARCHIVED, SmmContentStatus.IDEA),
    ).toBe(false);
  });

  it('lets REVISION return to production paths', () => {
    expect(
      canTransitionSmmContentStatus(SmmContentStatus.REVISION, SmmContentStatus.SCRIPT_COPY),
    ).toBe(true);
    expect(
      canTransitionSmmContentStatus(SmmContentStatus.REVISION, SmmContentStatus.PRODUCTION),
    ).toBe(true);
    expect(
      canTransitionSmmContentStatus(
        SmmContentStatus.REVISION,
        SmmContentStatus.INTERNAL_REVIEW,
      ),
    ).toBe(true);
  });

  it('maps statuses into progress groups', () => {
    expect(smmProgressGroupForStatus(SmmContentStatus.IDEA)).toBe(
      SmmProgressStatusGroup.IDEATION,
    );
    expect(smmProgressGroupForStatus(SmmContentStatus.PRODUCTION)).toBe(
      SmmProgressStatusGroup.PRODUCTION,
    );
    expect(smmProgressGroupForStatus(SmmContentStatus.CLIENT_REVIEW)).toBe(
      SmmProgressStatusGroup.REVIEW,
    );
    expect(smmProgressGroupForStatus(SmmContentStatus.APPROVED)).toBe(
      SmmProgressStatusGroup.READY,
    );
    expect(smmProgressGroupForStatus(SmmContentStatus.PUBLISHED)).toBe(
      SmmProgressStatusGroup.LIVE,
    );
    expect(smmProgressGroupForStatus(SmmContentStatus.ARCHIVED)).toBe(
      SmmProgressStatusGroup.ARCHIVED,
    );
  });
});
