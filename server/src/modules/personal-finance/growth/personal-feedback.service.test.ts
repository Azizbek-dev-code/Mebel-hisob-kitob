import { AppFeedbackKind } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    identity: { findUnique: vi.fn() },
    appFeedback: { findMany: vi.fn() },
  },
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));

const { getFeedbackPromptStatus } = await import('./personal-feedback.service.js');

describe('getFeedbackPromptStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.identity.findUnique.mockResolvedValue({
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      feedbackOnboardingDismissedAt: null,
      feedbackOutcomeDismissedAt: null,
    });
    prismaMock.appFeedback.findMany.mockResolvedValue([]);
  });

  it('asks for onboarding feedback until it is written or dismissed', async () => {
    const open = await getFeedbackPromptStatus('idn_1', true, prismaMock as never);
    expect(open).toEqual({ showOnboarding: true, showOutcome: false });
  });

  it('asks for outcome feedback when write access ended', async () => {
    const ended = await getFeedbackPromptStatus('idn_1', false, prismaMock as never);
    expect(ended.showOutcome).toBe(true);
  });

  it('hides prompts after the user already left that kind of feedback', async () => {
    prismaMock.appFeedback.findMany.mockResolvedValue([{ kind: AppFeedbackKind.ONBOARDING_EXPECTATION }]);
    const status = await getFeedbackPromptStatus('idn_1', true, prismaMock as never);
    expect(status.showOnboarding).toBe(false);
  });
});
