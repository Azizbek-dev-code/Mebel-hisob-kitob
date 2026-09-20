import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { assertNoTelegramSecrets } from './telegram.sanitize.js';

const app = createApp();
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('Telegram secrets stay off the public surfaces', () => {
  it('does not put TELEGRAM_BOT_TOKEN on the client env surface', () => {
    const clientExample = readFileSync(path.join(repoRoot, 'client', '.env.example'), 'utf8');
    const viteEnv = readFileSync(path.join(repoRoot, 'client', 'src', 'vite-env.d.ts'), 'utf8');

    expect(clientExample).not.toMatch(/TELEGRAM_BOT_TOKEN/);
    expect(viteEnv).not.toMatch(/TELEGRAM_BOT_TOKEN/);
  });

  it('does not return the bot token from health or service info', async () => {
    const health = await request(app).get('/api/health').expect(200);
    const root = await request(app).get('/').expect(200);

    expect(health.body.data.telegram).toEqual({ configured: false, connected: false });
    expect(Object.keys(health.body.data.telegram)).toEqual(['configured', 'connected']);
    assertNoTelegramSecrets(health.body, [env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_WEBHOOK_SECRET]);
    assertNoTelegramSecrets(root.body, [env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_WEBHOOK_SECRET]);
  });

  it('does not leak secrets when the webhook is called without configuration', async () => {
    const response = await request(app)
      .post('/api/telegram/webhook')
      .send({ update_id: 1 })
      .expect(401);

    assertNoTelegramSecrets(response.body, [env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_WEBHOOK_SECRET]);
    expect(JSON.stringify(response.body)).not.toContain('TELEGRAM_BOT_TOKEN');
  });
});
