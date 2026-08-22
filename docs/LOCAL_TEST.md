# Local development & persistence checks

Exact commands from the root `package.json` for running Furniture ERP against local Postgres and disk storage.

## 1. Environment

```bash
npm run setup:env
```

Or copy manually:

- Root annotated reference: `.env.example` → `server/.env`
- Minimal copy: `server/.env.example` → `server/.env`

Confirm in `server/.env`:

| Variable | Local value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/furniture_erp?schema=public` |
| `STORAGE_DRIVER` | `local` |
| `STORAGE_LOCAL_DIR` | `./uploads` |
| `STORAGE_PUBLIC_URL` | `http://localhost:4000/uploads` |
| `CORS_ORIGIN` | `http://localhost:5173` |

`STORAGE_DRIVER=local` serves uploaded images from the API process (`/uploads`). Do not switch to Cloudinary for day-to-day local work unless you are testing cloud uploads.

## 2. Database

Postgres must be running and the database created (example name `furniture_erp`).

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:seed` is **minimal**: store + admin only (no catalogue, customers, or demo workers).

Optional rich demo fixtures (old catalogue / cashier / Ali / sample customers):

```bash
npm run db:seed:demo
```

Wipe all business/demo/E2E data locally while keeping Store + admin (dev only):

```bash
npm run db:clean-demo -- --i-understand-dev-only
```

PowerShell if npm strips the flag:

```powershell
$env:ALLOW_DEMO_CLEANUP="true"; npm run db:clean-demo
```

Requires `ALLOW_DEMO_CLEANUP=true` **or** `--i-understand-dev-only`. Always refused when `NODE_ENV=production`. Hosted DB URLs (Render, Neon, …) also abort unless `FORCE_DEMO_CLEANUP=true`.

Optional GUI:

```bash
npm run db:studio
```

## 3. Dev servers

From the repository root:

```bash
npm run dev
```

This runs shared (watch), API (`http://localhost:4000`), and Vite (`http://localhost:5173`).

Separate processes if needed:

```bash
npm run dev:server
npm run dev:client
```

Health check: `GET http://localhost:4000/api/health`

Seed admin (from `.env`): `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (defaults `admin@furniture-erp.local` / `Admin123!`).

## 4. Tests

```bash
npm test
```

Workspace-scoped:

```bash
npm run test:shared
npm run test:server
npm run test:client
```

## 5. Persistence smoke (sale fees)

After `npm run dev` and a clean store (`db:seed` or `db:clean-demo`), create your own product/customer (or use `db:seed:demo`):

1. Sign in at `http://localhost:5173`
2. Create a sale with **Usta haqqi** `300000` and **Shopir haqqi** `150000`
3. Open the sale detail — both fees and net profit should match
4. Hard-refresh the browser — values must still match (API + DB, not only React Query cache)
5. Edit fees on the detail page (admin) — refresh again

API shape: request aliases `assemblerFee` / `driverFee` persist as `Sale.installationCost` / `Sale.deliveryCost` and are returned under **both** names on GET.

## 6. What this is not

Local readiness here means Postgres + `STORAGE_DRIVER=local`. Do **not** redesign the app to persist business data in `localStorage`.
