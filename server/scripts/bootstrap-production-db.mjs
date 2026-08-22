/**
 * One-shot empty-database bootstrap for production (Neon, etc.).
 *
 * Why: historical migrations are deltas (ALTER …), not a full CREATE baseline.
 * `prisma migrate deploy` alone fails on an empty DB. This script:
 *   1. prisma db push          — apply current schema
 *   2. migrate resolve --applied for every migration folder
 *   3. prisma migrate deploy   — should be a no-op if all resolved
 *
 * Usage (from repo root or server/):
 *   node scripts/bootstrap-production-db.mjs
 *
 * Requires DATABASE_URL. Does NOT seed — run `npm run db:seed` separately.
 * Never run against a DB that already has live data you care about without
 * reading docs/MIGRATION_BASELINE.md first.
 */
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(serverRoot, 'prisma', 'migrations');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: serverRoot, stdio: 'inherit', env: process.env });
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

if (process.env.CONFIRM_EMPTY_DB_BOOTSTRAP !== 'true') {
  console.error(
    'Refusing to run. Set CONFIRM_EMPTY_DB_BOOTSTRAP=true after you confirm the\n' +
      'target DATABASE_URL is an empty (or intentionally baselined) database.\n' +
      'See docs/MIGRATION_BASELINE.md.',
  );
  process.exit(1);
}

const migrations = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{14}_/.test(d.name))
  .map((d) => d.name)
  .sort();

if (migrations.length === 0) {
  console.error('No migrations found under prisma/migrations.');
  process.exit(1);
}

run('npx prisma db push');
for (const name of migrations) {
  run(`npx prisma migrate resolve --applied ${name}`);
}
run('npx prisma migrate deploy');
run('npx prisma migrate status');

console.log('\nBootstrap complete. Next: npm run db:seed (platform admin + plans).');
