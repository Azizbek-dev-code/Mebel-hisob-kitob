# Production deployment checklist

Target stack: **Vercel** (SPA + API as a serverless function) + **Neon** (Postgres) +
**Vercel Blob** (images).

Do not deploy until every item below is configured. This file is the runbook; it
does not perform a deploy.

## How the Vercel deployment is wired

`vercel.json` at the repo root is the source of truth:

- `buildCommand` builds `shared`, generates the Prisma client and compiles `server`,
  builds `client`, then copies `client/dist` to a root `public/` folder (Vercel's static
  output). `public/` is gitignored — it only exists during a build.
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
| `DATABASE_URL` | Neon connection string with `?sslmode=require` |
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
- After baseline, apply migrations from your machine before deploying schema changes:
  `cd server && DATABASE_URL=… npx prisma migrate deploy`. The Vercel build only runs
  `prisma generate`; it never migrates.
- Seed is **manual** (`npm run db:seed`) — never runs on deploy.
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

# Exactly what Vercel runs (see vercel.json "buildCommand")
npm run build --workspace shared && cd server && npx prisma generate && npx tsc -p tsconfig.json && cd .. && npm run build --workspace client && rm -rf public && cp -r client/dist public

# Self-hosting the API instead (Render, a VPS, …)
npm run build --workspace shared
npm run build --workspace server
cd server && npm run start:prod   # migrate deploy + node dist/server.js
```

## Sale worker pay

See [SALE_WORKER_PAY.md](./SALE_WORKER_PAY.md) for MANUAL Ish haqlari vs RULE compensation and P&L semantics.
