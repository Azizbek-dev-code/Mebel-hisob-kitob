# Production deployment checklist

Target stack: **Vercel** (SPA) + **Render** (API) + **Neon** (Postgres) + **Cloudinary** (images).

Do not deploy until every item below is configured. This file is the runbook; it
does not perform a deploy.

## Required environment variables

### Backend (Render)

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | Render sets this; do not hardcode |
| `DATABASE_URL` | Neon connection string with `?sslmode=require` |
| `JWT_ACCESS_SECRET` | ≥32 chars (unique per environment) |
| `JWT_REFRESH_SECRET` | ≥32 chars |
| `JWT_ACCESS_EXPIRES_IN` | Default `15m` |
| `COOKIE_SECRET` | ≥16 chars |
| `COOKIE_SECURE` | **`true`** (HTTPS) |
| `COOKIE_SAME_SITE` | Prefer **`lax`** with Vercel `/api` rewrites; use **`none`** only for cross-origin SPA→API (requires `COOKIE_SECURE=true`) |
| `CORS_ORIGIN` | Exact Vercel origin(s), comma-separated (e.g. `https://app.vercel.app`) |
| `STORAGE_DRIVER` | **`cloudinary`** — `local` is rejected when `NODE_ENV=production` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Required |
| `BACKUP_DIR` | Writable temp dir; artefacts are ephemeral — download immediately |
| `BACKUP_MAX_UPLOAD_BYTES` | Default 50MB |
| `BACKUP_ENABLE_PG_DUMP` | Keep `false` unless `pg_dump` is installed |
| `TRIAL_DAYS` | Optional; default `7` |
| `SEED_*` | Only needed for one-shot `npm run db:seed` — change passwords before seeding prod |

`STORAGE_DRIVER=supabase` is **not implemented** — do not set it.

### Frontend (Vercel build env)

| Variable | Notes |
|----------|--------|
| `VITE_API_URL` | Prefer **`/api`** when using `vercel.json` rewrites (same-origin cookies). Or absolute `https://YOUR_API.onrender.com/api` with `COOKIE_SAME_SITE=none` |

## Auth cookies (Vercel + Render)

**Recommended (same-site):** leave `VITE_API_URL=/api` (or unset — client defaults to `/api`), point `vercel.json` rewrites at the Render host, keep `COOKIE_SAME_SITE=lax` and `COOKIE_SECURE=true`.

**Cross-origin alternative:** set `VITE_API_URL=https://api…/api`, `CORS_ORIGIN` to the Vercel origin, `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true`.

## Storage

- Local disk uploads (`./uploads`) are lost on Render redeploy.
- Production **rejects** `STORAGE_DRIVER=local`.
- Verify before go-live:
  1. Set Cloudinary vars.
  2. Upload a product image; confirm a Cloudinary HTTPS URL.
  3. Redeploy the API and confirm the image still loads.
- Backups under `BACKUP_DIR` are ephemeral — **download** each backup after creation.

## Database (Neon)

- First empty Neon DB: follow `docs/MIGRATION_BASELINE.md` section **B** (`db push` + resolve + seed).
- After baseline: `cd server && npx prisma migrate deploy` (or `npm run start:prod`).
- Seed is **manual** (`npm run db:seed`) — not run on `npm start`.
- Never `migrate reset` / `db push --force-reset` against live tenant data.

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

# Frontend (Vercel): build command from repo root or client/
npm run build --workspace client
# Output: client/dist

# Backend (Render)
npm run build --workspace shared
npm run build --workspace server
cd server && npm run start:prod   # migrate deploy + node dist/server.js
# or: npx prisma migrate deploy && npm start
```

## Sale worker pay

See [SALE_WORKER_PAY.md](./SALE_WORKER_PAY.md) for MANUAL Ish haqlari vs RULE compensation and P&L semantics.
