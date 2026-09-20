import { GrowthFocusKind, GrowthFocusStatus, WorkspaceType } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock, createHabitLogMock, tryAwardXpMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    growthFocusSession: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    growthTodo: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    growthHabit: { findFirst: vi.fn() },
    expense: { findMany: vi.fn() },
    sale: { findMany: vi.fn() },
  },
  recordAuditMock: vi.fn(),
  createHabitLogMock: vi.fn(),
  tryAwardXpMock: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('./personal-growth-habits.service.js', () => ({ createHabitLog: createHabitLogMock }));
vi.mock('./personal-growth-xp.service.js', () => ({
  tryAwardXp: tryAwardXpMock,
  focusXpAmount: (minutes: number) => minutes,
}));

const { completeFocusSession, startFocusSession } = await import(
  './personal-growth-focus.service.js'
);

const START = new Date('2026-09-17T10:00:00.000Z');
const RUNNING = {
  id: 'focus_1',
  workspaceId: 'ws_1',
  identityId: 'idn_1',
  todoId: 'todo_1',
  habitId: null,
  linkedGoalId: null,
  kind: GrowthFocusKind.FOCUS,
  status: GrowthFocusStatus.RUNNING,
  plannedMinutes: 25,
  startedAt: START,
  endedAt: null,
  durationSeconds: null,
  creditedMinutes: 0,
  clientReportedSeconds: null,
  discardReason: null,
  createdAt: START,
  updatedAt: START,
  todo: { id: 'todo_1', title: 'React auth' },
  habit: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  prismaMock.workspace.findUnique.mockResolvedValue({
    id: 'ws_1',
    type: WorkspaceType.PERSONAL,
    status: 'ACTIVE',
    storeId: null,
  });
  prismaMock.growthFocusSession.findMany.mockResolvedValue([]);
  prismaMock.growthFocusSession.count.mockResolvedValue(0);
  prismaMock.growthTodo.updateMany.mockResolvedValue({ count: 1 });
  createHabitLogMock.mockResolvedValue({});
  tryAwardXpMock.mockResolvedValue(null);
});

describe('startFocusSession', () => {
  it('starts a focus block linked to a todo without touching ERP', async () => {
    prismaMock.growthFocusSession.findFirst.mockResolvedValue(null);
    prismaMock.growthTodo.findFirst.mockResolvedValue({ id: 'todo_1' });
    prismaMock.growthFocusSession.create.mockResolvedValue(RUNNING);
    const session = await startFocusSession(
      'ws_1',
      'idn_1',
      { plannedMinutes: 25, todoId: 'todo_1' },
      prismaMock as never,
      START,
    );
    expect(session.status).toBe('RUNNING');
    expect(session.todoTitle).toBe('React auth');
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled();
    expect(prismaMock.sale.findMany).not.toHaveBeenCalled();
  });
});

describe('completeFocusSession', () => {
  it('credits planned minutes and increments todo actualMinutes', async () => {
    prismaMock.growthFocusSession.findFirst.mockResolvedValue(RUNNING);
    const end = new Date('2026-09-17T10:25:10.000Z');
    prismaMock.growthFocusSession.update.mockResolvedValue({
      ...RUNNING,
      status: GrowthFocusStatus.COMPLETED,
      endedAt: end,
      durationSeconds: 25 * 60 + 10,
      creditedMinutes: 25,
    });
    const session = await completeFocusSession(
      'ws_1',
      'idn_1',
      'focus_1',
      { interrupted: false },
      prismaMock as never,
      end,
    );
    expect(session.creditedMinutes).toBe(25);
    expect(prismaMock.growthTodo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { actualMinutes: { increment: 25 } },
      }),
    );
  });

  it('caps a forgotten 10h timer to the planned length', async () => {
    prismaMock.growthFocusSession.findFirst.mockResolvedValue(RUNNING);
    const end = new Date('2026-09-17T20:00:00.000Z');
    prismaMock.growthFocusSession.update.mockImplementation(async ({ data }) => ({
      ...RUNNING,
      ...data,
      todo: RUNNING.todo,
    }));
    const session = await completeFocusSession(
      'ws_1',
      'idn_1',
      'focus_1',
      { interrupted: false, clientReportedSeconds: 10 * 60 * 60 },
      prismaMock as never,
      end,
    );
    expect(session.creditedMinutes).toBe(25);
    expect(session.discardReason).toBe('CAPPED_IDLE_TIMER');
  });

  it('logs credited minutes to a duration habit and skips focus XP', async () => {
    const linked = {
      ...RUNNING,
      todoId: null,
      habitId: 'habit_1',
      todo: null,
      habit: { id: 'habit_1', title: 'Ingliz tili' },
    };
    prismaMock.growthFocusSession.findFirst.mockResolvedValue(linked);
    prismaMock.growthHabit.findFirst.mockResolvedValue({ id: 'habit_1', targetUnit: 'duration' });
    const end = new Date('2026-09-17T10:20:00.000Z');
    prismaMock.growthFocusSession.update.mockResolvedValue({
      ...linked,
      status: GrowthFocusStatus.INTERRUPTED,
      endedAt: end,
      durationSeconds: 20 * 60,
      creditedMinutes: 20,
    });
    await completeFocusSession(
      'ws_1',
      'idn_1',
      'focus_1',
      { interrupted: true, clientReportedSeconds: 20 * 60 },
      prismaMock as never,
      end,
    );
    expect(createHabitLogMock).toHaveBeenCalledWith(
      'ws_1',
      'habit_1',
      'idn_1',
      { value: 20 },
      expect.anything(),
      end,
    );
    expect(tryAwardXpMock).not.toHaveBeenCalled();
  });
});
