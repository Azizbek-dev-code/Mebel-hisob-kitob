# Production deployment checklist

Target stack: **Vercel** (SPA + API as a serverless function) + **Neon** (Postgres) +
**Vercel Blob** (images) or **Cloudinary**.

Public production origin: **https://www.mebelboshqaruv.uz**

Do not deploy until every item below is configured. This file is the runbook; it
does not perform a deploy.

**V1 → V2:** use root [`DEPLOYMENT.md`](../DEPLOYMENT.md) and
[`PRODUCTION_CHECKLIST.md`](../PRODUCTION_CHECKLIST.md). **Backup Neon before
any migrate or GitHub push.** Cursor must not deploy, push, or apply production
migrations.

## How the Vercel deployment is wired

`vercel.json` at the repo root is the source of truth:

- `buildCommand` builds `shared`, generates the Prisma client, **applies pending
  Prisma migrations** (`node scripts/migrate-deploy.mjs` → `prisma migrate deploy`),
  compiles `server`, builds `client`, then copies `client/dist` to a root `public/`
  folder (Vercel's static output). `public/` is gitignored — it only exists during a
  build.
- `api/index.js` is a Vercel Node function that lazy-loads `server/dist/app.js` and
  hands each request to the Express app.
- `routes` send `/api/*` to that function, serve static files from `public/`, and fall
  back to `index.html` for client-side routing.

The Vercel project must be **Git-connected** to this repository (Project → Settings →
Git) for pushes to `main` to deploy automatically.

## Required environment variables (Vercel project → Settings → Environment Variables)

Set these for **Production** (and Preview if you use preview deployments). The API
skips `.env` loading when `VERCEL` is set, so everything must come from here.

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon connection string with `?sslmode=require`. Must be enabled for **Production** and available at **Build** (Vercel now runs `prisma migrate deploy` during build). Prefer the **direct** host (`*.neon.tech`, not `*-pooler.neon.tech`) so migrations can take an advisory lock. |
| `DIRECT_URL` | Optional. If `DATABASE_URL` is the pooled URL, set this to the Neon **direct** connection string. `migrate deploy` uses `DIRECT_URL` when present. |
| `JWT_ACCESS_SECRET` | ≥32 chars (unique per environment) |
| `JWT_REFRESH_SECRET` | ≥32 chars |
| `JWT_ACCESS_EXPIRES_IN` | Default `15m` |
| `COOKIE_SECRET` | ≥16 chars |
| `COOKIE_SECURE` | **`true`** (HTTPS) |
| `COOKIE_SAME_SITE` | **`lax`** — SPA and API share one origin on Vercel |
| `CORS_ORIGIN` | The deployment's own origin(s), comma-separated (e.g. `https://app.vercel.app`) |
| `STORAGE_DRIVER` | **`vercel-blob`** — `local` is rejected when `NODE_ENV=production`; `cloudinary` also works |
| `BLOB_READ_WRITE_TOKEN` | Injected automatically once a Blob store is linked to the project (Storage tab) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Only if `STORAGE_DRIVER=cloudinary` |
| `BACKUP_DIR` | **`/tmp/backups`** — on Vercel only `/tmp` is writable, and it does not survive between invocations |
| `BACKUP_MAX_UPLOAD_BYTES` | Default 50MB |
| `BACKUP_ENABLE_PG_DUMP` | Keep `false` — `pg_dump` is not available in the function runtime |
| `TRIAL_DAYS` | Optional; default `7` |
| `SEED_*` | Only needed for one-shot `npm run db:seed` — change passwords before seeding prod |
| `TELEGRAM_BOT_TOKEN` | Optional. Telegram Bot API token for `@balancyspace_bot`. Leave unset to disable Telegram; the API still starts. **Never** expose this to the client, API responses, or logs. |
| `TELEGRAM_WEBHOOK_SECRET` | Optional. Telegram webhook `secret_token` (not the bot token). Required before `setWebhook` / inbound updates work. |
| `PUBLIC_APP_URL` | Public app origin (e.g. `https://www.mebelboshqaruv.uz`). Used for `/app` links and the default webhook URL. |
| `TELEGRAM_WEBHOOK_URL` | Optional override. Defaults to `${PUBLIC_APP_URL}/api/telegram/webhook`. |
| `CRON_SECRET` | Protects cron routes (`POST /api/telegram/cron/*` and `POST /api/presence/cron/maintenance`). Send as `Authorization: Bearer <secret>` or `x-cron-secret`. |

### Telegram webhook setup

1. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `PUBLIC_APP_URL=https://www.mebelboshqaruv.uz` in the Vercel project env.
2. Deploy so `/api/telegram/webhook` is live.
3. Register the webhook once:
   - Platform Admin: `POST /api/telegram/setup-webhook` (authenticated), or
   - CLI from `server/`: `node scripts/telegram-set-webhook.mjs` (loads `server/.env`; prints ok/fail without the token).
4. Confirm BotFather / `getWebhookInfo` shows the HTTPS URL and that updates arrive.
5. Daily summary cron is declared in `vercel.json` (`0 3 * * *` → `/api/telegram/cron/daily-summary`). Configure Vercel to send `CRON_SECRET` (or use the Authorization header Vercel documents for cron).

Users link Telegram from the app (`POST /api/telegram/link/start` → open deep-link → confirm in bot). Unlink via `POST /api/telegram/unlink` or `/unlink` in chat.

Not needed on Vercel: `PORT` (the function runtime owns the socket) and `VITE_API_URL`
(the client defaults to `/api`, which is same-origin here).

`STORAGE_DRIVER=supabase` is **not implemented** — do not set it.

## Auth cookies

The SPA and the API are served from the same Vercel origin, so keep
`COOKIE_SAME_SITE=lax` and `COOKIE_SECURE=true`. Only if you ever split the API onto a
different host would you need `VITE_API_URL=https://api…/api`, `CORS_ORIGIN` set to the
SPA origin, and `COOKIE_SAME_SITE=none`.

## Storage

- The function filesystem is read-only apart from `/tmp`, and `/tmp` is wiped between
  invocations. Nothing that must persist can live on disk.
- Production **rejects** `STORAGE_DRIVER=local`.
- Verify before go-live:
  1. Link a Blob store to the project and confirm `BLOB_READ_WRITE_TOKEN` is present.
  2. Upload a product image; confirm a `*.public.blob.vercel-storage.com` URL.
  3. Redeploy and confirm the image still loads.
- Backups are written to `BACKUP_DIR` and may already be gone by the next request —
  **download** each backup immediately after creating it. The job row survives; the
  file does not.

## Database (Neon)

- First empty Neon DB: follow `docs/MIGRATION_BASELINE.md` section **B** (`db push` + resolve + seed).
- After baseline, **pending migrations apply on every Vercel production build**
  (`cd server && node scripts/migrate-deploy.mjs`). That is additive
  (`prisma migrate deploy` only — never reset / never `db push --force-reset`).
- Seed is **manual** (`npm run db:seed`) — never runs on deploy.
- Never `migrate reset` / `db push --force-reset` against live tenant data.

### If login 500s with `users.deletedAt does not exist`

The account-deletion migration is already in git:
`server/prisma/migrations/20260913120000_account_deletion/`.
Do **not** create another migration. Apply this one to Neon, then redeploy.

**Preferred (from your machine, against Neon, not a local DB):**

```bash
cd server
# Use the Vercel Production DATABASE_URL (Neon). Direct host, not -pooler.
$env:DATABASE_URL="postgresql://…@ep-….neon.tech/neondb?sslmode=require"
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

`migrate deploy` only runs SQL that `_prisma_migrations` has not recorded.
Existing rows are untouched; `deletedAt` is nullable (NULL = still able to log in).

**If `migrate deploy` errors with P3005** (schema not empty / history never
baselined): do **not** reset. In the Neon SQL Editor paste the existing file
`server/prisma/migrations/20260913120000_account_deletion/migration.sql`, run it,
then mark it applied (still no reset):

```bash
cd server
$env:DATABASE_URL="postgresql://…@ep-….neon.tech/neondb?sslmode=require"
npx prisma migrate resolve --applied 20260913120000_account_deletion
```

Then **Redeploy** the Vercel production deployment (Deployments → … → Redeploy)
so the next build sees a matching schema. Login should already work as soon as
the column exists, even before that redeploy, because production code already
queries `deletedAt`.

## Health

`GET /api/health` returns `status` / `database` only — no secrets or stacks.

## Auth / security

- HTTP-only session cookie; passwords hashed (bcrypt).
- Login and public store-request routes are rate-limited.
- Every business query is scoped by `storeId` from the session (DB-backed isolation).
- PLATFORM_ADMIN is a normal user row created by seed / ops — not env-magic at runtime.

## Build & start

```bash
# Monorepo (CI / local verify)
npm run build

# Exactly what Vercel runs (see vercel.json "buildCommand")
npm run build --workspace shared && cd server && npx prisma generate && node scripts/migrate-deploy.mjs && npx tsc -p tsconfig.json && cd .. && npm run build --workspace client && rm -rf public && cp -r client/dist public

# Self-hosting the API instead (Render, a VPS, …)
npm run build --workspace shared
npm run build --workspace server
cd server && npm run start:prod   # migrate deploy + node dist/server.js
```

## Sale worker pay

See [SALE_WORKER_PAY.md](./SALE_WORKER_PAY.md) for MANUAL Ish haqlari vs RULE compensation and P&L semantics.

## V2 (Telegram / presence / analytics)

- Telegram webhook path stays `/api/telegram/webhook`. Do not switch it to ngrok.
- Seed automations are `enabled=false`. Turn them on in Platform Admin after `/start` works.
- Presence heartbeat only counts `visible && active`. Idle open tabs are offline after 5 minutes.
- Platform usage APIs are `requireAuth` + `requirePlatformAdmin`. Store ADMIN gets 403.
- Analytics metadata is whitelist-only. Financial keys never persist.
- Pending Prisma migrations apply on Vercel production **build**. Backup Neon first.
