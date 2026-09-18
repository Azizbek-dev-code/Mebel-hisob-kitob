import {
  GrowthEventPriority,
  GrowthEventRecurrence,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    workspace: { findUnique: vi.fn() },
    growthCalendarEvent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    expense: { findMany: vi.fn() },
    sale: { findMany: vi.fn() },
  },
  recordAuditMock: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));

const {
  createGrowthCalendarEvent,
  listGrowthCalendarEvents,
  listUpcomingGrowthReminders,
  updateGrowthCalendarEvent,
} = await import('./personal-plan.service.js');

const NOW = new Date('2026-09-17T10:00:00.000Z');
const EVENT = {
  id: 'evt_1',
  workspaceId: 'ws_1',
  title: 'React dars',
  note: null,
  category: 'Dasturlash',
  priority: GrowthEventPriority.HIGH,
  startsAt: new Date('2026-09-17T14:00:00.000Z'),
  endsAt: new Date('2026-09-17T15:00:00.000Z'),
  allDay: false,
  recurrence: GrowthEventRecurrence.NONE,
  intervalDays: null,
  remindMinutesBefore: 30,
  isCancelled: false,
  linkedGoalId: null,
  linkedTodoId: null,
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
});

describe('listGrowthCalendarEvents', () => {
  it('lists workspace events and never touches store ERP tables', async () => {
    prismaMock.growthCalendarEvent.findMany.mockResolvedValue([EVENT]);
    const result = await listGrowthCalendarEvents(
      'ws_1',
      {
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-09-30T23:59:59.999Z'),
      },
      prismaMock as never,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe('React dars');
    expect(result.items[0]?.remindAt).toBe('2026-09-17T13:30:00.000Z');
    expect(result.daysWithEvents).toEqual(['2026-09-17']);
    expect(prismaMock.expense.findMany).not.toHaveBeenCalled();
    expect(prismaMock.sale.findMany).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/storeId/);
  });
});

describe('createGrowthCalendarEvent', () => {
  it('creates a reminded event scoped to the personal workspace', async () => {
    prismaMock.growthCalendarEvent.create.mockResolvedValue(EVENT);
    const created = await createGrowthCalendarEvent(
      'ws_1',
      {
        title: 'React dars',
        category: 'Dasturlash',
        priority: GrowthEventPriority.HIGH,
        startsAt: '2026-09-17T14:00:00.000Z',
        endsAt: '2026-09-17T15:00:00.000Z',
        remindMinutesBefore: 30,
      },
      'idn_1',
      prismaMock as never,
    );
    expect(created.remindAt).toBe('2026-09-17T13:30:00.000Z');
    expect(prismaMock.growthCalendarEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ workspaceId: 'ws_1', title: 'React dars' }),
      }),
    );
  });
});

describe('listUpcomingGrowthReminders', () => {
  it('returns only events whose remindAt falls in the window', async () => {
    prismaMock.growthCalendarEvent.findMany.mockResolvedValue([EVENT]);
    const result = await listUpcomingGrowthReminders(
      'ws_1',
      6 * 60,
      prismaMock as never,
      NOW,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe('React dars');
  });
});

describe('updateGrowthCalendarEvent', () => {
  it('soft-cancels without deleting historical rows', async () => {
    prismaMock.growthCalendarEvent.findFirst.mockResolvedValue(EVENT);
    prismaMock.growthCalendarEvent.update.mockResolvedValue({ ...EVENT, isCancelled: true });
    const updated = await updateGrowthCalendarEvent(
      'ws_1',
      'evt_1',
      { isCancelled: true },
      'idn_1',
      prismaMock as never,
    );
    expect(updated.isCancelled).toBe(true);
  });
});
