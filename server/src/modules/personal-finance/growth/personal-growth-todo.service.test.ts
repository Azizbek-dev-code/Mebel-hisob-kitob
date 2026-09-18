import {
  GrowthEventPriority,
  GrowthTodoStatus,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    growthTodo: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    growthCalendarEvent: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    expense: { findMany: vi.fn() },
    sale: { findMany: vi.fn() },
  },
  recordAuditMock: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));

const {
  createGrowthTodo,
  listTodayGrowthTodos,
  suggestGrowthTodo,
  updateGrowthTodo,
} = await import('./personal-growth-todo.service.js');

const NOW = new Date('2026-09-17T10:00:00.000Z');
const TODO = {
  id: 'todo_1',
  workspaceId: 'ws_1',
  title: 'React authentication — 60 min',
  description: null,
  priority: GrowthEventPriority.MEDIUM,
  status: GrowthTodoStatus.TODO,
  category: 'Dasturlash',
  dueAt: new Date('2026-09-17T18:00:00.000Z'),
  remindMinutesBefore: null,
  estimatedMinutes: 60,
  actualMinutes: 0,
  recurrence: 'NONE',
  intervalDays: null,
  isDailyFocus: true,
  completedAt: null,
  linkedGoalId: null,
  linkedCalendarEventId: null,
  createdAt: new Date('2026-09-17T09:00:00.000Z'),
  updatedAt: new Date('2026-09-17T09:00:00.000Z'),
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
  prismaMock.growthTodo.count.mockResolvedValue(0);
});

describe('suggestGrowthTodo', () => {
  it('parses duration without calling the database', () => {
    const hint = suggestGrowthTodo('IELTS vocabulary 30 daq');
    expect(hint.estimatedMinutes).toBe(30);
    expect(hint.category).toBe('IELTS');
    expect(prismaMock.growthTodo.findMany).not.toHaveBeenCalled();
  });
});

describe('createGrowthTodo', () => {
  it('creates a todo with smart defaults and never touches ERP tables', async () => {
    prismaMock.growthTodo.create.mockResolvedValue(TODO);
    const created = await createGrowthTodo(
      'ws_1',
      { title: 'React authentication — 60 min' },
      'idn_1',
      prismaMock as never,
    );
    expect(created.estimatedMinutes).toBe(60);
    expect(created.category).toBe('Dasturlash');
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled();
    expect(prismaMock.sale.findMany).not.toHaveBeenCalled();
    expect(JSON.stringify(created)).not.toMatch(/storeId/);
  });

  it('can also create a linked calendar event', async () => {
    prismaMock.growthCalendarEvent.create.mockResolvedValue({ id: 'evt_1' });
    prismaMock.growthTodo.create.mockResolvedValue({
      ...TODO,
      linkedCalendarEventId: 'evt_1',
    });
    prismaMock.growthCalendarEvent.updateMany.mockResolvedValue({ count: 1 });
    const created = await createGrowthTodo(
      'ws_1',
      { title: 'React dars', addToCalendar: true },
      'idn_1',
      prismaMock as never,
    );
    expect(created.linkedCalendarEventId).toBe('evt_1');
    expect(prismaMock.growthCalendarEvent.create).toHaveBeenCalled();
  });
});

describe('listTodayGrowthTodos', () => {
  it('returns focus tasks for the home command center', async () => {
    prismaMock.growthTodo.findMany.mockResolvedValue([TODO]);
    const result = await listTodayGrowthTodos('ws_1', prismaMock as never, NOW);
    expect(result.focus).toHaveLength(1);
    expect(result.focus[0]?.title).toContain('React');
  });
});

describe('updateGrowthTodo', () => {
  it('marks a todo done with completedAt', async () => {
    prismaMock.growthTodo.findFirst.mockResolvedValue(TODO);
    prismaMock.growthTodo.update.mockResolvedValue({
      ...TODO,
      status: GrowthTodoStatus.DONE,
      completedAt: NOW,
      isDailyFocus: false,
    });
    const updated = await updateGrowthTodo(
      'ws_1',
      'todo_1',
      { status: GrowthTodoStatus.DONE },
      'idn_1',
      prismaMock as never,
      NOW,
    );
    expect(updated.status).toBe('DONE');
    expect(updated.completedAt).toBe(NOW.toISOString());
  });
});
