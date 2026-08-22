/**
 * Test environment bootstrap.
 *
 * Runs before any test file is imported, so `config/env.ts` sees a complete and
 * valid configuration without depending on a developer's local `.env`.
 * `dotenv` never overrides values that are already set, so these win.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '4001';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/furniture_erp_test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-that-is-long-enough-000000';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-that-is-long-enough-00000';
process.env.COOKIE_SECRET = process.env.COOKIE_SECRET ?? 'test-cookie-secret-value';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
