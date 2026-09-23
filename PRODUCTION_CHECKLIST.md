# Production checklist (V1 → V2)

Print this. Check each box yourself. Do not skip backup.

Production domain: `https://www.mebelboshqaruv.uz`

## Before anything

- [ ] Neon backup / PITR snapshot created and downloadable
- [ ] I will **not** run `prisma migrate reset` or `db push --force-reset`
- [ ] I will **not** paste secrets into git, chat, or tickets
- [ ] Local `git status` reviewed; no `.env`, `node_modules`, `dist`, `backups`

## GitHub

- [ ] Commit locally (this agent does not commit)
- [ ] Push to the Vercel-connected branch **after** backup

## Vercel env (Production) — names only

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (Neon, `sslmode=require`; prefer direct host for migrate)
- [ ] `DIRECT_URL` optional (Neon non-pooler)
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (≥32)
- [ ] `COOKIE_SECRET` (≥16)
- [ ] `COOKIE_SECURE=true`
- [ ] `COOKIE_SAME_SITE=lax`
- [ ] `CORS_ORIGIN=https://www.mebelboshqaruv.uz`
- [ ] `STORAGE_DRIVER=cloudinary` or `vercel-blob` (never `local` / `supabase`)
- [ ] Cloudinary trio **or** Blob token
- [ ] `BACKUP_DIR=/tmp/backups`
- [ ] `TELEGRAM_BOT_TOKEN`
- [ ] `TELEGRAM_WEBHOOK_SECRET` (not the bot token)
- [ ] `PUBLIC_APP_URL=https://www.mebelboshqaruv.uz` (not localhost, not ngrok)
- [ ] `TELEGRAM_WEBHOOK_URL` optional; default `${PUBLIC_APP_URL}/api/telegram/webhook`
- [ ] `CRON_SECRET`
- [ ] Optional: `PRESENCE_OFFLINE_AFTER_SECONDS=300`, `ANALYTICS_IDLE_TIMEOUT=300`

## Database

- [ ] `cd server && npx prisma migrate status` (against Neon, not local)
- [ ] `npx prisma migrate deploy` **or** confirm Vercel build ran it
- [ ] `npx prisma migrate status` → up to date
- [ ] No DROP TABLE / TRUNCATE in pending SQL (V2 migrations are ADD-only)

## After deploy

- [ ] `GET /api/health` → `status: ok`, `database: up`, no tokens in body
- [ ] Register / login / logout
- [ ] Personal finance + growth (habits, todo, focus, goals, budgets)
- [ ] Business ERP (sale, purchase, product, inventory, customer, delivery, assembly, reports)
- [ ] Subscription gates still work
- [ ] Admin (store) cannot open `/api/platform/usage/*` (403)
- [ ] Platform Admin usage pages show counts/time only — **no so'm**
- [ ] Telegram `/start` still answers
- [ ] Webhook URL still `https://www.mebelboshqaruv.uz/api/telegram/webhook`
- [ ] Link / unlink / relink Telegram
- [ ] Automations remain **off** until enabled in Platform Admin
- [ ] Broadcast: one failed recipient does not stop the batch
- [ ] Presence: click → online; idle hidden tab → not online
- [ ] Friends: no self-request, no duplicate, block respected
- [ ] Ranking: XP only, hidden users omitted, privacy defaults FRIENDS / PUBLIC
- [ ] Mobile login + dashboard
- [ ] Vercel function logs for 15–30 minutes

## Rollback trigger

If login, sales, or health fail:

- [ ] Vercel → previous V1 deployment → Promote
- [ ] Do not roll back additive migrations
- [ ] Do not change the Telegram webhook unless the rollback build lacks `/api/telegram/webhook`

See `DEPLOYMENT.md` for the ordered procedure and `docs/PRODUCTION.md` for env detail.
