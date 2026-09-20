import { GrowthAimStatus, WorkspaceType } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock, tryAwardXpMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    growthAim: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  recordAuditMock: vi.fn(),
  tryAwardXpMock: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('./personal-growth-xp.service.js', () => ({ tryAwardXp: tryAwardXpMock }));

const { createGrowthAim, listGrowthAims, updateGrowthAim } = await import(
  './personal-growth-aims.service.js'
);

const NOW = new Date('2026-09-19T10:00:00.000Z');
const AIM = {
  id: 'aim_1',
  workspaceId: 'ws_1',
  title: 'IELTS 7+',
  note: null,
  status: GrowthAimStatus.ACTIVE,
  targetDate: null,
  completedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  tryAwardXpMock.mockResolvedValue(undefined);
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
});

describe('growth aims', () => {
  it('creates and lists aims for a personal workspace', async () => {
    prismaMock.growthAim.create.mockResolvedValue(AIM);
    prismaMock.growthAim.findMany.mockResolvedValue([AIM]);
    const created = await createGrowthAim('ws_1', 'idn_1', { title: 'IELTS 7+' });
    expect(created.title).toBe('IELTS 7+');
    const listed = await listGrowthAims('ws_1');
    expect(listed.items).toHaveLength(1);
  });

  it('awards milestone XP once when completed', async () => {
    prismaMock.growthAim.findFirst.mockResolvedValue(AIM);
    prismaMock.growthAim.update.mockResolvedValue({
      ...AIM,
      status: GrowthAimStatus.COMPLETED,
      completedAt: NOW,
    });
    await updateGrowthAim('ws_1', 'idn_1', 'aim_1', { status: GrowthAimStatus.COMPLETED });
    expect(tryAwardXpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'MILESTONE_REACHED',
        sourceEntityId: 'aim:aim_1',
      }),
    );
  });
});
