import { describe, expect, it, vi } from 'vitest';
import { AccountPurpose } from '@furniture-erp/shared';

import { attachBusinessOnboardingWorkspace } from './onboarding-attach.service.js';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    onboardingSubmission: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));

describe('attachBusinessOnboardingWorkspace', () => {
  it('binds the latest completed BUSINESS submission and ignores PERSONAL rows', async () => {
    prismaMock.onboardingSubmission.findMany.mockResolvedValue([
      {
        id: 'ob_personal',
        answers: { purpose: AccountPurpose.PERSONAL, goals: ['CONTROL_EXPENSES'] },
        completedAt: new Date('2026-09-14T02:00:00.000Z'),
      },
      {
        id: 'ob_business',
        answers: { purpose: AccountPurpose.BUSINESS, businessType: 'FURNITURE' },
        completedAt: new Date('2026-09-14T01:00:00.000Z'),
      },
    ]);
    prismaMock.onboardingSubmission.update.mockResolvedValue({});

    await attachBusinessOnboardingWorkspace('idn_1', 'ws_biz');

    expect(prismaMock.onboardingSubmission.update).toHaveBeenCalledWith({
      where: { id: 'ob_business' },
      data: { workspaceId: 'ws_biz' },
    });
  });
});
