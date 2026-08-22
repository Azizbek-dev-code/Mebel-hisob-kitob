# Production migration baseline

## Problem

This repository's Prisma migration history begins with **delta** migrations
(`ALTER TABLE …`) that assume tables already exist. Early development applied the
schema with `prisma db push`, so a database that was never tracked by
`_prisma_migrations` cannot run `prisma migrate deploy` (Prisma error **P3005**:
"The database schema is not empty").

## Goals

- Do **not** reset or wipe a database that already has live store data.
- Do **not** delete historical migration folders.
- Make `prisma migrate deploy` safe for the **first production cutover** and for
  every deploy after that.

## Strategy (choose by environment)

### A. Existing populated database (current cloud / local with data)

Baseline without replaying SQL that already ran via `db push`:

```bash
cd server

# 1. Ensure the live schema matches prisma/schema.prisma
npx prisma db push

# 2. Mark every existing migration as already applied (no SQL executed)
npx prisma migrate resolve --applied 20260808100000_phase5_sales_assembly
npx prisma migrate resolve --applied 20260808140000_phase6_worker_responsibilities
npx prisma migrate resolve --applied 20260809120000_phase8_worker_financial_transactions
npx prisma migrate resolve --applied 20260809140000_phase8_step2_worker_financial_reversals
npx prisma migrate resolve --applied 20260809160000_phase8_step4a_worker_compensation_rules
npx prisma migrate resolve --applied 20260813120000_sale_cancellation
npx prisma migrate resolve --applied 20260816100000_inventory_stock_foundation
npx prisma migrate resolve --applied 20260818120000_expense_soft_void
npx prisma migrate resolve --applied 20260818140000_worker_financial_compensation_ref
npx prisma migrate resolve --applied 20260819180000_supplier_purchases_foundation
npx prisma migrate resolve --applied 20260820100000_backup_jobs
npx prisma migrate resolve --applied 20260820140000_audit_log
npx prisma migrate resolve --applied 20260821120000_sale_worker_compensation
npx prisma migrate resolve --applied 20260822100000_store_creation_requests
npx prisma migrate resolve --applied 20260822120000_platform_billing
npx prisma migrate resolve --applied 20260822140000_saas_trial_subscription
npx prisma migrate resolve --applied 20260822160000_plan_entitlements

# 3. From now on, use migrate deploy only
npx prisma migrate deploy
```

If a later migration was already applied by `db push`, resolve it the same way
before `migrate deploy`.

### B. Brand-new empty production database (Neon / Render Postgres)

**Important:** `prisma migrate deploy` alone will fail on an empty DB because the
oldest migrations are deltas (`ALTER …`), not a full `CREATE` baseline.

Bootstrap once (or use the guarded script):

```bash
cd server
# Option 1 — script (requires CONFIRM_EMPTY_DB_BOOTSTRAP=true)
set CONFIRM_EMPTY_DB_BOOTSTRAP=true
npm run db:bootstrap:empty

# Option 2 — manual
npx prisma db push
# then resolve all migrations as in section A
npx prisma migrate deploy
npm run db:seed
```

Longer term: squash into a true `0_init` migration in a dedicated PR.

### C. Ongoing production deploys (after baseline)

```bash
npx prisma migrate deploy
npx prisma generate
node dist/server.js
```

Or from the server package: `npm run start:prod` (migrate deploy + start).

Never use `prisma migrate reset` or `db push --force-reset` in production after
go-live data exists.

## Verification

```bash
npx prisma migrate status
npx prisma validate
```

`migrate status` should report the database is up to date with no pending
migrations after baseline.
