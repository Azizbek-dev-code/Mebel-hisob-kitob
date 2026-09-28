import {
  SmmContentStatus,
  SmmProjectMemberRole,
  UserRole,
  canTransitionSmmContentStatus,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    smmProject: {
      findFirst: vi.fn(),
    },
    smmContentItem: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    smmActivity: {
      create: vi.fn(),
    },
  },
  recordAuditMock: vi.fn(),
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));

const { transitionContentStatus } = await import('./content.service.js');

const NOW = new Date('2026-09-28T12:00:00.000Z');

function baseContent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'content_1',
    projectId: 'proj_1',
    campaignId: null,
    platform: 'INSTAGRAM',
    contentType: 'REELS',
    title: 'Launch reel',
    publishAt: null,
    goal: null,
    topic: null,
    expectedResult: null,
    audienceSegmentId: null,
    personaId: null,
    pillarId: null,
    status: SmmContentStatus.CLIENT_REVIEW,
    referenceId: null,
    notes: 'internal note',
    format: null,
    hook: null,
    body: null,
    cta: null,
    caption: null,
    scriptNotes: null,
    shotList: null,
    productionNotes: null,
    headline: null,
    visualBrief: null,
    extras: null,
    createdById: 'user_admin',
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    project: { id: 'proj_1', storeId: 'store_1', name: 'Acme' },
    campaign: null,
    pillar: null,
    createdBy: { id: 'user_admin', fullName: 'Admin' },
    blocks: [],
    _count: { assignments: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  prismaMock.smmActivity.create.mockResolvedValue({});
  prismaMock.smmProject.findFirst.mockResolvedValue({
    id: 'proj_1',
    members: [{ role: SmmProjectMemberRole.CLIENT }],
  });
});

describe('transitionContentStatus', () => {
  it('lets a client approve from CLIENT_REVIEW', async () => {
    prismaMock.smmContentItem.findFirst.mockResolvedValue(baseContent());
    prismaMock.smmContentItem.update.mockResolvedValue(
      baseContent({ status: SmmContentStatus.APPROVED, notes: null }),
    );

    expect(
      canTransitionSmmContentStatus(
        SmmContentStatus.CLIENT_REVIEW,
        SmmContentStatus.APPROVED,
      ),
    ).toBe(true);

    const result = await transitionContentStatus(
      'store_1',
      'user_client',
      UserRole.WORKER,
      'content_1',
      { status: SmmContentStatus.APPROVED },
    );

    expect(result.status).toBe(SmmContentStatus.APPROVED);
    expect(prismaMock.smmContentItem.update).toHaveBeenCalled();
  });

  it('blocks a client from jumping to PUBLISHED', async () => {
    prismaMock.smmContentItem.findFirst.mockResolvedValue(baseContent());

    await expect(
      transitionContentStatus('store_1', 'user_client', UserRole.WORKER, 'content_1', {
        status: SmmContentStatus.PUBLISHED,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
