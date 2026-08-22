import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../app.js';

const app = createApp();

describe('GET /', () => {
  it('returns service information instead of a 404', async () => {
    const response = await request(app).get('/').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      name: 'Furniture ERP API',
      status: 'ok',
      environment: 'test',
      apiBasePath: '/api',
      healthPath: '/api/health',
    });
  });

  it('does not swallow unknown paths', async () => {
    const response = await request(app).get('/not-a-route').expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
