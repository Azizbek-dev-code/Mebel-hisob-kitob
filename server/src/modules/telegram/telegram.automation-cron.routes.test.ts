import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';

const {
  isCronSecretAuthorized,
  runTelegramAutomationTick,
  runTelegramAutoMessageTick,
} = vi.hoisted(() => ({
  isCronSecretAuthorized: vi.fn(),
  runTelegramAutomationTick: vi.fn(),
  runTelegramAutoMessageTick: vi.fn(),
}));

vi.mock('../../utils/cron-secret.js', () => ({
  isCronSecretAuthorized,
  secretsMatch: vi.fn(),
}));

vi.mock('./telegram.automation.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./telegram.automation.service.js')>();
  return {
    ...actual,
    runTelegramAutomationTick,
  };
});

vi.mock('./telegram.auto-message.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./telegram.auto-message.service.js')>();
  return {
    ...actual,
    runTelegramAutoMessageTick,
  };
});

const app = createApp();

describe('GET|POST /api/telegram/cron/automation-tick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runTelegramAutomationTick.mockResolvedValue({ sent: 1, ran: 1 });
    runTelegramAutoMessageTick.mockResolvedValue({ sent: 2, ran: 2, due: 2 });
  });

  it('rejects GET without CRON_SECRET authorization', async () => {
    isCronSecretAuthorized.mockReturnValue(false);
    const response = await request(app).get('/api/telegram/cron/automation-tick').expect(401);
    expect(response.body.success).toBe(false);
    expect(runTelegramAutoMessageTick).not.toHaveBeenCalled();
    expect(runTelegramAutomationTick).not.toHaveBeenCalled();
  });

  it('rejects POST without CRON_SECRET authorization', async () => {
    isCronSecretAuthorized.mockReturnValue(false);
    const response = await request(app).post('/api/telegram/cron/automation-tick').expect(401);
    expect(response.body.success).toBe(false);
    expect(runTelegramAutoMessageTick).not.toHaveBeenCalled();
  });

  it('GET runs the same automation tick handlers when authorized (Vercel Cron)', async () => {
    isCronSecretAuthorized.mockReturnValue(true);
    const response = await request(app).get('/api/telegram/cron/automation-tick').expect(200);

    expect(isCronSecretAuthorized).toHaveBeenCalled();
    expect(runTelegramAutomationTick).toHaveBeenCalledTimes(1);
    expect(runTelegramAutoMessageTick).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual({
      success: true,
      data: {
        sent: 3,
        ran: 3,
        legacy: { sent: 1, ran: 1 },
        universal: { sent: 2, ran: 2, due: 2 },
      },
    });
  });

  it('POST still runs the same automation tick handlers when authorized', async () => {
    isCronSecretAuthorized.mockReturnValue(true);
    const response = await request(app).post('/api/telegram/cron/automation-tick').expect(200);

    expect(runTelegramAutomationTick).toHaveBeenCalledTimes(1);
    expect(runTelegramAutoMessageTick).toHaveBeenCalledTimes(1);
    expect(response.body.data.sent).toBe(3);
    expect(response.body.data.ran).toBe(3);
  });
});
