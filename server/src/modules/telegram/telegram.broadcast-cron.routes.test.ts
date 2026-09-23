import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';

const { isCronSecretAuthorized, processBroadcastQueue } = vi.hoisted(() => ({
  isCronSecretAuthorized: vi.fn(),
  processBroadcastQueue: vi.fn(),
}));

vi.mock('../../utils/cron-secret.js', () => ({
  isCronSecretAuthorized,
  secretsMatch: vi.fn(),
}));

vi.mock('./telegram.broadcast.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./telegram.broadcast.service.js')>();
  return {
    ...actual,
    processBroadcastQueue,
  };
});

const app = createApp();

describe('GET|POST /api/telegram/cron/broadcast-tick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    processBroadcastQueue.mockResolvedValue({ processed: true });
  });

  it('rejects GET without CRON_SECRET authorization', async () => {
    isCronSecretAuthorized.mockReturnValue(false);
    const response = await request(app).get('/api/telegram/cron/broadcast-tick').expect(401);
    expect(response.body.success).toBe(false);
    expect(processBroadcastQueue).not.toHaveBeenCalled();
  });

  it('rejects POST without CRON_SECRET authorization', async () => {
    isCronSecretAuthorized.mockReturnValue(false);
    const response = await request(app).post('/api/telegram/cron/broadcast-tick').expect(401);
    expect(response.body.success).toBe(false);
    expect(processBroadcastQueue).not.toHaveBeenCalled();
  });

  it('GET runs processBroadcastQueue when authorized (Vercel Cron)', async () => {
    isCronSecretAuthorized.mockReturnValue(true);
    const response = await request(app).get('/api/telegram/cron/broadcast-tick').expect(200);

    expect(isCronSecretAuthorized).toHaveBeenCalled();
    expect(processBroadcastQueue).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual({
      success: true,
      data: { processed: true },
    });
  });

  it('POST still runs processBroadcastQueue when authorized', async () => {
    isCronSecretAuthorized.mockReturnValue(true);
    const response = await request(app).post('/api/telegram/cron/broadcast-tick').expect(200);

    expect(processBroadcastQueue).toHaveBeenCalledTimes(1);
    expect(response.body.data.processed).toBe(true);
  });
});
