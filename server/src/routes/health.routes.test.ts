import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../app.js';

const app = createApp();

describe('GET /api/health', () => {
  it('reports that the API is up, wrapped in the success envelope', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      status: expect.stringMatching(/^(ok|degraded)$/),
      environment: 'test',
      database: expect.stringMatching(/^(up|down)$/),
    });
    expect(typeof response.body.data.uptimeSeconds).toBe('number');
  });

  it('echoes a correlation id back to the caller', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('X-Request-Id', 'test-correlation-id')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('test-correlation-id');
  });
});

describe('unknown routes', () => {
  it('returns a 404 in the error envelope', async () => {
    const response = await request(app).get('/api/does-not-exist').expect(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /api/does-not-exist does not exist',
      },
    });
  });
});
