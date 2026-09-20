import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => {
  const mock = {
    telegramConnection: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation(async (fn: (tx: typeof mock) => unknown) => fn(mock));
  return { prismaMock: mock };
});

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('./telegram.account-pref.service.js', () => ({
  listAccountPreferences: vi.fn().mockResolvedValue([]),
  seedAccountPreferencesForIdentity: vi.fn().mockResolvedValue(undefined),
}));

import {
  activateOrReplaceConnection,
  getConnectionStatus,
  toStatusDto,
  unlinkConnection,
  updateTelegramPrefs,
} from './telegram.connection.service.js';

const baseRow = {
  id: 'tg_1',
  identityId: 'idn_1',
  telegramUserId: '100',
  telegramChatId: '100',
  username: 'ali',
  firstName: 'Ali',
  isActive: true,
  connectedAt: new Date('2026-01-01T00:00:00.000Z'),
  disconnectedAt: null,
  lastUsedAt: null,
  notifyBusiness: true,
  notifyPersonal: true,
  bizNotifySales: true,
  bizNotifyInventory: true,
  bizNotifyDelivery: true,
  bizNotifyAssembly: true,
  bizNotifyWorkers: true,
  bizNotifyBilling: true,
  bizNotifyImportant: true,
  personalNotifyBudget: true,
  personalNotifyGoals: true,
  personalNotifyRecurring: true,
  personalNotifyDebts: true,
  notifyDailySummaryBusiness: true,
  notifyDailySummaryPersonal: true,
  notifyWeeklySummaryBusiness: true,
  notifyWeeklySummaryPersonal: true,
  notifyMonthlySummaryBusiness: true,
  notifyMonthlySummaryPersonal: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('getConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
  });

  it('returns disconnected shape when missing', async () => {
    prismaMock.telegramConnection.findUnique.mockResolvedValue(null);
    const status = await getConnectionStatus('idn_missing');
    expect(status.connected).toBe(false);
    expect(status.username).toBeNull();
    expect(status.connectedAt).toBeNull();
  });

  it('returns dto when active', async () => {
    prismaMock.telegramConnection.findUnique.mockResolvedValue(baseRow);
    const status = await getConnectionStatus('idn_1');
    expect(status).toEqual(toStatusDto(baseRow));
    expect(status.connected).toBe(true);
  });
});

describe('activateOrReplaceConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
  });

  it('rejects when an active telegram user belongs to another identity', async () => {
    prismaMock.telegramConnection.findFirst.mockResolvedValue({ ...baseRow, identityId: 'idn_other' });
    prismaMock.telegramConnection.findUnique.mockResolvedValue(null);

    const result = await activateOrReplaceConnection({
      identityId: 'idn_1',
      telegramUserId: '100',
      telegramChatId: '100',
    });
    expect(result).toEqual({ ok: false, reason: 'telegram_user_taken' });
    expect(prismaMock.telegramConnection.create).not.toHaveBeenCalled();
  });

  it('allows connecting after the previous identity unlinked (inactive row remains)', async () => {
    prismaMock.telegramConnection.findFirst.mockResolvedValue(null);
    prismaMock.telegramConnection.findUnique.mockResolvedValue(null);
    prismaMock.telegramConnection.create.mockResolvedValue({
      ...baseRow,
      id: 'tg_b',
      identityId: 'idn_b',
    });

    const result = await activateOrReplaceConnection({
      identityId: 'idn_b',
      telegramUserId: '100',
      telegramChatId: '100',
    });
    expect(result.ok).toBe(true);
    expect(prismaMock.telegramConnection.findFirst).toHaveBeenCalledWith({
      where: { telegramUserId: '100', isActive: true },
    });
    expect(prismaMock.telegramConnection.create).toHaveBeenCalled();
  });

  it('creates a new connection', async () => {
    prismaMock.telegramConnection.findFirst.mockResolvedValue(null);
    prismaMock.telegramConnection.findUnique.mockResolvedValue(null);
    prismaMock.telegramConnection.create.mockResolvedValue(baseRow);

    const result = await activateOrReplaceConnection({
      identityId: 'idn_1',
      telegramUserId: '100',
      telegramChatId: '100',
      username: 'ali',
      firstName: 'Ali',
    });
    expect(result.ok).toBe(true);
    expect(prismaMock.telegramConnection.create).toHaveBeenCalled();
  });

  it('updates an existing identity connection', async () => {
    prismaMock.telegramConnection.findFirst.mockResolvedValue(baseRow);
    prismaMock.telegramConnection.findUnique.mockResolvedValue(baseRow);
    prismaMock.telegramConnection.update.mockResolvedValue({ ...baseRow, firstName: 'Ali2' });

    const result = await activateOrReplaceConnection({
      identityId: 'idn_1',
      telegramUserId: '100',
      telegramChatId: '100',
      firstName: 'Ali2',
    });
    expect(result.ok).toBe(true);
    expect(prismaMock.telegramConnection.update).toHaveBeenCalled();
  });
});

describe('unlinkConnection / updateTelegramPrefs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deactivates on unlink and records disconnectedAt', async () => {
    prismaMock.telegramConnection.findUnique.mockResolvedValue(baseRow);
    prismaMock.telegramConnection.update.mockResolvedValue({ ...baseRow, isActive: false });
    const status = await unlinkConnection('idn_1');
    expect(status.connected).toBe(false);
    expect(prismaMock.telegramConnection.update).toHaveBeenCalledWith({
      where: { identityId: 'idn_1' },
      data: { isActive: false, disconnectedAt: expect.any(Date) },
    });
  });

  it('patches prefs on an active connection', async () => {
    prismaMock.telegramConnection.findUnique.mockResolvedValue(baseRow);
    prismaMock.telegramConnection.update.mockResolvedValue({
      ...baseRow,
      bizNotifySales: false,
    });
    const status = await updateTelegramPrefs('idn_1', { bizNotifySales: false });
    expect(status.bizNotifySales).toBe(false);
  });
});
