#!/usr/bin/env node
/**
 * Creates `server/.env` from `server/.env.example`, replacing every placeholder
 * secret with a freshly generated random value.
 *
 * Run with `npm run setup:env`. Existing files are left untouched unless
 * `--force` is passed, so it is safe to re-run.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const examplePath = path.join(rootDir, 'server', '.env.example');
const targetPath = path.join(rootDir, 'server', '.env');
const force = process.argv.includes('--force');

if (!existsSync(examplePath)) {
  console.error(`Missing ${path.relative(rootDir, examplePath)}`);
  process.exit(1);
}

if (existsSync(targetPath) && !force) {
  console.log(`server/.env already exists — leaving it alone. Use --force to regenerate.`);
  process.exit(0);
}

const secret = (bytes) => randomBytes(bytes).toString('hex');

const contents = readFileSync(examplePath, 'utf8')
  .replace(/^JWT_ACCESS_SECRET=.*$/m, `JWT_ACCESS_SECRET="${secret(32)}"`)
  .replace(/^JWT_REFRESH_SECRET=.*$/m, `JWT_REFRESH_SECRET="${secret(32)}"`)
  .replace(/^COOKIE_SECRET=.*$/m, `COOKIE_SECRET="${secret(24)}"`);

writeFileSync(targetPath, contents, 'utf8');

console.log('Created server/.env with freshly generated secrets.');
console.log('Next: set DATABASE_URL to your PostgreSQL connection string.');
