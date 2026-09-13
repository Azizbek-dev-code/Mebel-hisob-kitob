/**
 * Apply pending Prisma migrations. Additive only — never reset, never push.
 *
 * Used by Vercel production builds and by operators against Neon.
 * Prefers DIRECT_URL (Neon non-pooler) when set, otherwise DATABASE_URL.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    'DATABASE_URL is required for prisma migrate deploy.\n' +
      'On Vercel: Project → Settings → Environment Variables → DATABASE_URL\n' +
      'must be enabled for Production (and available at Build).\n' +
      'Optional: set DIRECT_URL to the Neon direct (non-pooler) connection string.',
  );
  process.exit(1);
}

console.log('Applying pending Prisma migrations (prisma migrate deploy)…');
execSync('npx prisma migrate deploy', {
  cwd: serverRoot,
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: databaseUrl },
});
console.log('Prisma migrations are up to date.');
