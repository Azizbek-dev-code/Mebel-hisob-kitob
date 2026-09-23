# Production deployment (V1 → V2)

This is the **manual** runbook. Cursor / local agents must not deploy, push, or
connect to production. You run these steps yourself after a database backup.

Production app origin: **https://www.mebelboshqaruv.uz**

Target stack: **Vercel** (SPA + `/api` serverless) + **Neon** (Postgres) +
**Cloudinary or Vercel Blob** (uploads) + **Telegram Bot API**.

## Safety rules

- Never `prisma migrate reset`, `prisma db push --force-reset`, or drop tables.
- Never change production env secrets from this repo.
- Never rotate Telegram / JWT / Cloudinary / Neon secrets from this runbook.
- Never point `STORAGE_DRIVER=local` or `STORAGE_DRIVER=supabase` at production.
- Never put localhost or ngrok URLs in production `PUBLIC_APP_URL`.
- Default Telegram automations ship **`enabled=false`**. Enable them in Platform Admin after you verify `/start`.

## Architecture note (migration timing)

`vercel.json` `buildCommand` already runs `node scripts/migrate-deploy.mjs`
(`prisma migrate deploy`) during the Vercel **production build**.

That means a GitHub push to the connected production branch **will apply pending
migrations** as part of the deploy. Additive V2 migrations are backward-compatible
with V1 rows (new tables / columns / indexes only).

Safer operator order:

1. Backup Neon.
2. Verify Vercel env vars.
3. Optionally apply `npx prisma migrate deploy` against Neon **before** the
   GitHub push (V1 code still runs — new columns have defaults).
4. Push / deploy V2. Vercel migrate deploy is then a no-op if you already applied.

Do **not** deploy V2 code without the V2 tables. If you skip step 3, the Vercel
build still migrates before the new function goes live.

## 1. GitHub

1. Open the repo on GitHub.
2. Confirm you are on the production branch (usually `main`).
3. Review the V2 commit locally (`git status`, `git diff`). Commit yourself.
4. Push only after backup + env verification.

## 2. Vercel

1. Open Vercel → project → **Settings → Environment Variables**.
2. Confirm Production values (names only — see `PRODUCTION_CHECKLIST.md`).
3. Confirm Git is connected. A push to the production branch triggers a build.
4. Do not click Deploy until backup is done.

## 3. Neon

1. Open Neon console → production project.
2. Create a **backup / point-in-time snapshot** (or export) **before** migrate.
3. Prefer the **direct** host (`*.neon.tech`, not `*-pooler.neon.tech`) for migrate.
4. Optional: set `DIRECT_URL` on Vercel to that direct string.

## 4. Cloudinary (or Vercel Blob)

1. Confirm `STORAGE_DRIVER=cloudinary` **or** `vercel-blob`.
2. Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Blob: project Storage tab linked so `BLOB_READ_WRITE_TOKEN` is present.
4. Upload a product image after deploy; confirm the public URL still loads.

## 5. Environment variables

See `.env.example` and `docs/PRODUCTION.md`. Required production names:

- `NODE_ENV=production`
- `DATABASE_URL` (and optional `DIRECT_URL`)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`
- `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=lax`
- `CORS_ORIGIN=https://www.mebelboshqaruv.uz`
- `STORAGE_DRIVER=cloudinary` or `vercel-blob`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
- `PUBLIC_APP_URL=https://www.mebelboshqaruv.uz`
- `CRON_SECRET`

Optional: `TELEGRAM_WEBHOOK_URL`, `PRESENCE_OFFLINE_AFTER_SECONDS` (default 300),
`ANALYTICS_IDLE_TIMEOUT` (default 300), `ANALYTICS_EVENT_RETENTION_DAYS` (default 90).

Never paste real secret values into git, tickets, or this file.

## 6. Prisma migration

From a machine that can reach Neon (not from this agent):

```bash
cd server
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

Or let the Vercel production build run the same `migrate deploy`.

If `P3005` (schema not empty / never baselined): stop. Follow
`docs/MIGRATION_BASELINE.md`. Do not reset.

## 7. Telegram webhook

Current path (unchanged from V1): `POST /api/telegram/webhook`

1. After V2 is live, check BotFather / `getWebhookInfo`.
2. Expected URL: `https://www.mebelboshqaruv.uz/api/telegram/webhook`
3. Only call `POST /api/telegram/setup-webhook` (Platform Admin) or
   `node scripts/telegram-set-webhook.mjs` if the URL/secret is missing.
4. Do not point the webhook at localhost or ngrok.

## 8. Cron (Vercel)

Declared in `vercel.json`:

| Path | Schedule |
|------|----------|
| `/api/telegram/cron/daily-summary` | `0 3 * * *` |
| `/api/telegram/cron/broadcast-tick` | `* * * * *` |
| `/api/telegram/cron/automation-tick` | `* * * * *` |
| `/api/presence/cron/maintenance` | `15 4 * * *` |

Vercel must send `CRON_SECRET` (`Authorization: Bearer …` or `x-cron-secret`).

Automations do nothing until you enable them in Platform Admin.

## 9. Production verification

1. `GET https://www.mebelboshqaruv.uz/api/health` → `status` is `ok`, no secrets in JSON.
2. Login / logout / `/api/auth/me`.
3. Personal: transaction, habit, todo, focus, budget.
4. Business: sale, product, customer, delivery, assembly, report.
5. Telegram `/start`, link, unlink.
6. Presence: interact → online; idle hidden tab → not online.
7. Friends request / accept (no self / duplicate).
8. Global ranking shows XP only (no money).
9. Platform Admin → usage analytics: DAU/WAU/MAU, no so'm / profit / balance.
10. Mobile viewport login + dashboard.

## 10. Rollback

If V2 is critically broken:

1. Vercel → Deployments → previous **V1** deployment → **Promote / Rollback**.
2. Do **not** reverse Prisma migrations. V2 SQL is additive; V1 code ignores new
   tables/columns.
3. Leave Telegram webhook on `/api/telegram/webhook` (same path).
4. Leave automations disabled if they were never enabled.

If a future migration were destructive (none in this V2 set), rollback of app
code alone would not be enough — that is why V2 migrations only ADD.
