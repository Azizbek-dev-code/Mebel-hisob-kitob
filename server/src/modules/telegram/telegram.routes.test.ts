import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';
import { TELEGRAM_WEBHOOK_SECRET_HEADER } from './telegram.types.js';

const {
  readTelegramRuntime,
  handleTelegramUpdate,
  getConnectionStatus,
  unlinkConnection,
  startLinkForRequest,
  updateTelegramPrefs,
  resolveIdentityIdForTelegram,
  setTelegramWebhook,
} = vi.hoisted(() => ({
  readTelegramRuntime: vi.fn(),
  handleTelegramUpdate: vi.fn(),
  getConnectionStatus: vi.fn(),
  unlinkConnection: vi.fn(),
  startLinkForRequest: vi.fn(),
  updateTelegramPrefs: vi.fn(),
  resolveIdentityIdForTelegram: vi.fn(),
  setTelegramWebhook: vi.fn(),
}));

vi.mock('./telegram.config.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    readTelegramRuntime,
  };
});

vi.mock('./telegram.admin.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./telegram.admin.service.js')>();
  return {
    ...actual,
    hydrateTelegramRuntimeFromDb: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('./telegram.commands.js', () => ({
  handleTelegramUpdate,
}));

vi.mock('./telegram.connection.service.js', () => ({
  getConnectionStatus,
  unlinkConnection,
  updateTelegramPrefs,
}));

vi.mock('./telegram.account.service.js', () => ({
  startLinkForRequest,
  resolveIdentityIdForTelegram,
}));

vi.mock('./telegram.service.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    setTelegramWebhook,
  };
});

vi.mock('../../middleware/require-auth.js', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../../middleware/require-platform-admin.js', () => ({
  requirePlatformAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const app = createApp();

const disconnected = {
  connected: false,
  username: null,
  firstName: null,
  connectedAt: null,
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
  accounts: [],
};

describe('POST /api/telegram/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleTelegramUpdate.mockResolvedValue(undefined);
  });

  it('rejects an unauthenticated webhook without a configured secret', async () => {
    readTelegramRuntime.mockReturnValue({
      configured: true,
      expectedUsername: 'balancyspace_bot',
      token: '123456:TEST-TELEGRAM-BOT-TOKEN-DO-NOT-LEAK',
    });

    const response = await request(app).post('/api/telegram/webhook').send({ update_id: 1 }).expect(401);

    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain('123456:TEST-TELEGRAM-BOT-TOKEN-DO-NOT-LEAK');
  });

  it('accepts a validated update when the Telegram secret header matches', async () => {
    readTelegramRuntime.mockReturnValue({
      configured: true,
      expectedUsername: 'balancyspace_bot',
      token: '123456:TEST-TELEGRAM-BOT-TOKEN-DO-NOT-LEAK',
      webhookSecret: 'test-webhook-secret',
    });

    const response = await request(app)
      .post('/api/telegram/webhook')
      .set(TELEGRAM_WEBHOOK_SECRET_HEADER, 'test-webhook-secret')
      .send({ update_id: 77, message: { text: '/start abc' } })
      .expect(200);

    expect(response.body).toEqual({ success: true, data: { accepted: true } });
    expect(handleTelegramUpdate).toHaveBeenCalled();
    expect(JSON.stringify(response.body)).not.toContain('123456:TEST-TELEGRAM-BOT-TOKEN-DO-NOT-LEAK');
    expect(JSON.stringify(response.body)).not.toContain('test-webhook-secret');
  });

  it('still acks when the command handler throws', async () => {
    readTelegramRuntime.mockReturnValue({
      configured: true,
      expectedUsername: 'balancyspace_bot',
      token: '123456:TEST-TELEGRAM-BOT-TOKEN-DO-NOT-LEAK',
      webhookSecret: 'test-webhook-secret',
    });
    handleTelegramUpdate.mockRejectedValue(new Error('boom'));

    const response = await request(app)
      .post('/api/telegram/webhook')
      .set(TELEGRAM_WEBHOOK_SECRET_HEADER, 'test-webhook-secret')
      .send({ update_id: 88 })
      .expect(200);

    expect(response.body).toEqual({ success: true, data: { accepted: true } });
  });

  it('rejects an invalid update payload after the secret is verified', async () => {
    readTelegramRuntime.mockReturnValue({
      configured: true,
      expectedUsername: 'balancyspace_bot',
      token: '123456:TEST-TELEGRAM-BOT-TOKEN-DO-NOT-LEAK',
      webhookSecret: 'test-webhook-secret',
    });

    const response = await request(app)
      .post('/api/telegram/webhook')
      .set(TELEGRAM_WEBHOOK_SECRET_HEADER, 'test-webhook-secret')
      .send({ nope: true })
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain('123456:TEST-TELEGRAM-BOT-TOKEN-DO-NOT-LEAK');
  });
});

describe('authenticated Telegram account routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveIdentityIdForTelegram.mockResolvedValue('idn_1');
    getConnectionStatus.mockResolvedValue(disconnected);
    unlinkConnection.mockResolvedValue(disconnected);
    startLinkForRequest.mockResolvedValue({
      deepLink: 'https://t.me/BalancySpace_bot?start=abc',
      expiresAt: '2026-09-20T12:00:00.000Z',
    });
    updateTelegramPrefs.mockResolvedValue({ ...disconnected, connected: true, bizNotifySales: false });
    setTelegramWebhook.mockResolvedValue({ ok: true });
  });

  it('GET /status returns connection status without secrets', async () => {
    const response = await request(app).get('/api/telegram/status').expect(200);
    expect(response.body.data.connected).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain('TELEGRAM_BOT_TOKEN');
  });

  it('POST /link/start returns deepLink + expiresAt only', async () => {
    const response = await request(app).post('/api/telegram/link/start').expect(200);
    expect(response.body.data).toEqual({
      deepLink: 'https://t.me/BalancySpace_bot?start=abc',
      expiresAt: '2026-09-20T12:00:00.000Z',
    });
    expect(response.body.data.tokenHash).toBeUndefined();
    expect(response.body.data.startPayload).toBeUndefined();
  });

  it('POST /unlink returns disconnected status', async () => {
    const response = await request(app).post('/api/telegram/unlink').expect(200);
    expect(response.body.data.connected).toBe(false);
  });

  it('PATCH /prefs updates preferences', async () => {
    const response = await request(app)
      .patch('/api/telegram/prefs')
      .send({ bizNotifySales: false })
      .expect(200);
    expect(updateTelegramPrefs).toHaveBeenCalledWith('idn_1', { bizNotifySales: false });
    expect(response.body.data.bizNotifySales).toBe(false);
  });

  it('POST /setup-webhook surfaces Telegram setWebhook description', async () => {
    setTelegramWebhook.mockResolvedValue({
      ok: false,
      reason: 'api_error',
      webhookUrl: 'https://www.mebelboshqaruv.uz/api/telegram/webhook',
      webhookSecretConfigured: true,
      httpStatus: 400,
      errorCode: 400,
      description: 'Bad Request: bad webhook: Failed to resolve host',
    });

    const response = await request(app).post('/api/telegram/setup-webhook').expect(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Telegram setWebhook xatosi:');
    expect(response.body.error.message).toContain('Failed to resolve host');
  });
});
