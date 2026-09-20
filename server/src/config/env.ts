import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Resolve `.env` relative to this file rather than `process.cwd()`, so the API
// behaves the same whether it is started from the repo root, the server folder,
// or from `dist/` after a production build.
// Skip dotenv loading on Vercel — env vars are injected by the platform.
const currentDir = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.VERCEL) {
  loadDotenv({ path: path.resolve(currentDir, '../../.env') });
}

const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true');

/** Optional secrets: blank `.env` values mean "not configured", not an empty string. */
const optionalSecret = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters'),
  COOKIE_SECURE: booleanFromString.default('false'),
  /**
   * `lax` — SPA and API same-site (Vite proxy / Vercel rewrites to `/api`).
   * `none` — cross-origin SPA→API (e.g. Vercel + Render); requires COOKIE_SECURE=true.
   */
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  STORAGE_DRIVER: z.enum(['local', 'cloudinary', 'supabase', 'vercel-blob']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./uploads'),
  STORAGE_PUBLIC_URL: z.string().default('http://localhost:4000/uploads'),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Backups are written here before download. On a host with an ephemeral
  // filesystem the directory does not survive a restart, which is why the
  // artefact is meant to be downloaded rather than left on the server.
  BACKUP_DIR: z.string().default('./backups'),
  BACKUP_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(52_428_800),
  BACKUP_ENABLE_PG_DUMP: booleanFromString.default('false'),

  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().optional(),

  SEED_ADMIN_EMAIL: z.string().email().default('admin@furniture-erp.local'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Admin123!'),
  SEED_STORE_NAME: z.string().default('Mebel Savdo'),
  SEED_PLATFORM_ADMIN_EMAIL: z.string().email().default('platform@furniture-erp.local'),
  SEED_PLATFORM_ADMIN_PASSWORD: z.string().min(8).default('Platform123!'),
  /** Demo catalog prices in so'm. Override in env — do not invent ad-hoc amounts in code. */
  SEED_PLAN_START_PRICE: z.coerce.number().int().nonnegative().default(150_000),
  SEED_PLAN_PRO_PRICE: z.coerce.number().int().nonnegative().default(200_000),
  SEED_PLAN_BUSINESS_PRICE: z.coerce.number().int().nonnegative().default(350_000),
  SEED_DEFAULT_PLAN_NAME: z.string().min(1).default('START'),
  TRIAL_DAYS: z.coerce.number().int().positive().max(90).default(7),

  /**
   * Telegram Bot API token (server-side only). Empty/missing disables Telegram
   * without crashing the process. Never log this value or return it from APIs.
   */
  TELEGRAM_BOT_TOKEN: optionalSecret,
  /**
   * Optional secret Telegram echoes as `X-Telegram-Bot-Api-Secret-Token`.
   * Webhook processing stays disabled until this is set. Do not use the bot token.
   */
  TELEGRAM_WEBHOOK_SECRET: optionalSecret,
  /**
   * Public app origin for /app links and default webhook URL.
   * Production default used in code when unset: https://balancy.space
   */
  PUBLIC_APP_URL: optionalSecret,
  /** Explicit webhook URL; defaults to `${PUBLIC_APP_URL}/api/telegram/webhook`. */
  TELEGRAM_WEBHOOK_URL: optionalSecret,
  /** Protects cron routes (`Authorization: Bearer …` or `x-cron-secret`). */
  CRON_SECRET: optionalSecret,
  PRESENCE_OFFLINE_AFTER_SECONDS: z.coerce.number().int().positive().max(3600).default(300),
  PRESENCE_HEARTBEAT_SECONDS: z.coerce.number().int().positive().max(300).default(45),
  ANALYTICS_IDLE_TIMEOUT: z.coerce.number().int().positive().max(3600).default(300),
  ANALYTICS_EVENT_RETENTION_DAYS: z.coerce.number().int().positive().max(730).default(90),
});

export type Env = z.infer<typeof envSchema> & {
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  corsOrigins: string[];
};

function parseEnv(): Env {
  // Trim trailing newlines/whitespace from all env values — Vercel CLI pipes
  // can introduce \r\n which breaks strict enum validation.
  const trimmed: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    trimmed[key] = typeof value === 'string' ? value.trim() : (value ?? '');
  }
  const result = envSchema.safeParse(trimmed);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        'Copy `.env.example` to `server/.env` and fill in the missing values.',
    );
  }

  const parsed = result.data;

  if (parsed.COOKIE_SAME_SITE === 'none' && !parsed.COOKIE_SECURE) {
    throw new Error(
      'Invalid environment configuration:\n' +
        '  - COOKIE_SAME_SITE=none requires COOKIE_SECURE=true (browsers reject insecure SameSite=None cookies).\n\n' +
        'Copy `.env.example` to `server/.env` and fill in the missing values.',
    );
  }

  if (
    parsed.NODE_ENV === 'production' &&
    parsed.STORAGE_DRIVER === 'local'
  ) {
    throw new Error(
      'Invalid environment configuration:\n' +
        '  - STORAGE_DRIVER=local is not allowed when NODE_ENV=production (ephemeral disks lose uploads).\n' +
        '  - Set STORAGE_DRIVER=vercel-blob or STORAGE_DRIVER=cloudinary instead.\n\n' +
        'See docs/PRODUCTION.md.',
    );
  }

  return {
    ...parsed,
    isDevelopment: parsed.NODE_ENV === 'development',
    isProduction: parsed.NODE_ENV === 'production',
    isTest: parsed.NODE_ENV === 'test',
    corsOrigins: parsed.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}

export const env: Env = parseEnv();
