import { WorkspaceType } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock, awardXpMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    growthAchievementUnlock: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    growthTodo: { count: vi.fn() },
    growthFocusSession: { count: vi.fn(), findMany: vi.fn() },
    growthProgress: { findUnique: vi.fn() },
    growthHabitCheckIn: { count: vi.fn() },
    growthDailyGoal: { count: vi.fn() },
    growthLearningGoal: { count: vi.fn() },
    personalSavingGoal: { count: vi.fn() },
    personalEntry: { count: vi.fn() },
    personalGoalContribution: { count: vi.fn() },
    growthFriendship: { count: vi.fn() },
    growthChallengeParticipant: { count: vi.fn() },
    growthFriendStreak: { findMany: vi.fn() },
  },
  recordAuditMock: vi.fn(),
  awardXpMock: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('./personal-growth-xp.service.js', () => ({
  awardXp: awardXpMock,
  tryAwardXp: vi.fn(),
}));

const { evaluateAchievements, listAchievements } = await import(
  './personal-growth-achievements.service.js'
);

const NOW = new Date('2026-09-17T12:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  awardXpMock.mockResolvedValue({ awarded: 25, progress: {} });
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
  prismaMock.growthTodo.count.mockResolvedValue(1);
  prismaMock.growthFocusSession.count.mockResolvedValue(0);
  prismaMock.growthFocusSession.findMany.mockResolvedValue([]);
  prismaMock.growthProgress.findUnique.mockResolvedValue({
    bestStreak: 0,
    currentStreak: 0,
    level: 1,
  });
  prismaMock.growthHabitCheckIn.count.mockResolvedValue(0);
  prismaMock.growthDailyGoal.count.mockResolvedValue(0);
  prismaMock.growthLearningGoal.count.mockResolvedValue(0);
  prismaMock.personalSavingGoal.count.mockResolvedValue(0);
  prismaMock.personalEntry.count.mockResolvedValue(0);
  prismaMock.personalGoalContribution.count.mockResolvedValue(0);
  prismaMock.growthFriendship.count.mockResolvedValue(0);
  prismaMock.growthChallengeParticipant.count.mockResolvedValue(0);
  prismaMock.growthFriendStreak.findMany.mockResolvedValue([]);
  prismaMock.growthAchievementUnlock.findMany.mockResolvedValue([]);
  prismaMock.growthAchievementUnlock.create.mockImplementation(async ({ data }) => ({
    id: `u_${data.achievementKey}`,
    ...data,
    unlockedAt: NOW,
  }));
});

describe('evaluateAchievements', () => {
  it('unlocks FIRST_TASK and awards reward XP', async () => {
    prismaMock.growthAchievementUnlock.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'u_1',
          workspaceId: 'ws_1',
          identityId: 'idn_1',
          achievementKey: 'FIRST_TASK',
          rewardXp: 25,
          unlockedAt: NOW,
        },
      ]);

    const result = await evaluateAchievements('ws_1', 'idn_1', prismaMock as never);
    expect(result.newlyUnlocked).toContain('FIRST_TASK');
    expect(awardXpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'ACHIEVEMENT_UNLOCKED',
        sourceEntityId: 'achievement:FIRST_TASK',
        amount: 25,
      }),
    );
  });

  it('does not re-unlock existing badges', async () => {
    prismaMock.growthAchievementUnlock.findMany.mockResolvedValue([
      {
        id: 'u_1',
        workspaceId: 'ws_1',
        identityId: 'idn_1',
        achievementKey: 'FIRST_TASK',
        rewardXp: 25,
        unlockedAt: NOW,
      },
    ]);
    const result = await evaluateAchievements('ws_1', 'idn_1', prismaMock as never);
    expect(result.newlyUnlocked).toEqual([]);
    expect(prismaMock.growthAchievementUnlock.create).not.toHaveBeenCalled();
  });
});

describe('listAchievements', () => {
  it('returns catalog with unlock flags', async () => {
    prismaMock.growthAchievementUnlock.findMany.mockResolvedValue([
      {
        id: 'u_1',
        workspaceId: 'ws_1',
        identityId: 'idn_1',
        achievementKey: 'FIRST_TASK',
        rewardXp: 25,
        unlockedAt: NOW,
      },
    ]);
    const result = await listAchievements('ws_1', prismaMock as never);
    const first = result.items.find((i) => i.key === 'FIRST_TASK');
    expect(first?.unlocked).toBe(true);
    expect(result.unlockedCount).toBe(1);
    expect(result.totalCount).toBeGreaterThan(1);
  });
});
