# Furniture ERP

A furniture store ERP: point-of-sale, customers, installments, expenses and accounting reports.

The product goal drives every design decision: a cashier must be able to record a complete
sale — customer, furniture, deposit, installment plan, seller bonus, delivery and installation —
in one to two minutes, and the owner must get correct daily, monthly and yearly financials
without a notebook and a calculator.

---

## Status

| Phase | Scope                        | State       |
| ----- | ---------------------------- | ----------- |
| 0     | Project setup & architecture | ✅ Complete |
| 1     | Database & backend           | ✅ Complete |
| 2     | Authentication               | ✅ Complete |
| 3     | Application shell            | ✅ Complete |
| 4–14  | Features, reports, release   | Not started |

---

## Tech stack

**Client** — React, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query,
React Hook Form, Zod, Lucide React
**Server** — Node.js, Express, TypeScript, REST
**Database** — PostgreSQL via Prisma ORM
**Auth** — JWT in HTTP-only cookies, hashed passwords
**Tooling** — ESLint, Prettier, Vitest, React Testing Library, Supertest

---

## Repository layout

```
furniture-erp/
├── client/           React SPA
│   └── src/
│       ├── app/          Root component and providers
│       ├── components/   Design-system primitives (ui, layout, forms, tables, feedback)
│       ├── features/     One folder per domain area
│       ├── hooks/        Cross-feature React hooks
│       ├── lib/          API client, query client, class-name helper
│       ├── routes/       Router and route path registry
│       ├── services/     Typed API layer — the only place that calls the backend
│       ├── styles/       Tailwind entry point and design tokens
│       └── utils/        Display formatting
│
├── server/           Express REST API
│   ├── prisma/           Schema and seed script
│   └── src/
│       ├── config/       Validated environment configuration
│       ├── controllers/  HTTP in, HTTP out — no business logic
│       ├── middleware/   Auth, validation, errors, logging
│       ├── repositories/ Database access
│       ├── routes/       Route definitions
│       ├── services/     Business and accounting logic
│       ├── validators/   Zod request schemas
│       └── utils/        Errors, responses, logger
│
├── shared/           Types, enums and money maths used by both sides
└── scripts/          Repository maintenance scripts
```

Two rules keep this structure honest: business logic never lives in a UI component, and
monetary maths lives in `shared` so the client preview and the server's stored value can
never disagree.

---

## Getting started

### Prerequisites

- Node.js 20.11 or newer
- npm 10 or newer
- A PostgreSQL 14+ database (local install, Docker, or a hosted instance such as Neon or Supabase)

### Setup

```bash
npm install          # installs all three workspaces
npm run setup:env    # creates server/.env with freshly generated secrets
```

Then open `server/.env` and point `DATABASE_URL` at your database.

```bash
npm run db:migrate   # creates the schema
npm run db:seed      # creates the store, the sign-in accounts and sample data
npm run dev          # starts the API, the web app, and the shared type watcher
```

- Web app — http://localhost:5173
- API — http://localhost:4000/api
- Health check — http://localhost:4000/api/health

In development the Vite dev server proxies `/api` to the API, so the browser stays on a
single origin and the HTTP-only auth cookie behaves exactly as it will in production.

---

## Authentication

Sign in at http://localhost:5173/login with either the username or the email of an account.

`POST /api/auth/login` verifies the password with bcrypt and returns a JWT in an HTTP-only,
`SameSite=Lax` cookie — never in the response body — so no script on the page can read the
session. `GET /api/auth/me` returns the current user and `POST /api/auth/logout` expires the
cookie. Every protected route runs the `requireAuth` middleware, which re-reads the user from
the database on each request, so deactivating an account ends its session immediately rather
than at the next token expiry. The browser router's guards mirror this, but the API never
assumes they ran.

### Development accounts

Created by `npm run db:seed`, which resets both passwords on every run. Change
`SEED_ADMIN_PASSWORD` in `server/.env` and re-seed to use your own.

| Account | Username  | Email                          | Password      | Role    |
| ------- | --------- | ------------------------------ | ------------- | ------- |
| Admin   | `admin`   | `admin@furniture-erp.local`    | `Admin123!`   | ADMIN   |
| Cashier | `cashier` | `cashier@furniture-erp.local`  | `Cashier123!` | CASHIER |

These are development fixtures. A production deployment must set its own
`SEED_ADMIN_PASSWORD` and `JWT_ACCESS_SECRET`, and run with `COOKIE_SECURE=true`.

---

## Application shell

Every authenticated screen is rendered inside `AppLayout`: a fixed module rail on the left, a
header that names the current module and carries the account menu, and the page below it. Below
the `lg` breakpoint the rail becomes an overlay drawer and the header grows a menu button.

The modules and their paths are declared once — paths in `client/src/routes/paths.ts`, the
sidebar order and icons in `client/src/routes/navigation.ts` — so a link, a redirect and a
sidebar entry can never disagree about where a module lives.

| Path         | Module     | State                  |
| ------------ | ---------- | ---------------------- |
| `/dashboard` | Dashboard  | Placeholder — Phase 4  |
| `/sales`     | Sotuvlar   | Placeholder            |
| `/products`  | Mebellar   | Placeholder            |
| `/customers` | Mijozlar   | Placeholder            |
| `/expenses`  | Xarajatlar | Placeholder            |
| `/workers`   | Ishchilar  | Placeholder            |
| `/masters`   | Ustalar    | Placeholder            |
| `/reports`   | Hisobotlar | Placeholder            |
| `/settings`  | Sozlamalar | Placeholder            |

`/` redirects to `/dashboard`, and so does any address that matches nothing. Every one of these
routes sits behind the Phase 2 `ProtectedRoute` guard. `/system` keeps the foundation
diagnostics screen reachable by URL; it is deliberately outside the shell, because it has to
keep working when the shell or the session is what is broken.

---

## Scripts

Run from the repository root.

| Command              | What it does                                       |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Runs shared, server and client in watch mode       |
| `npm run build`      | Production build of all three workspaces           |
| `npm run typecheck`  | TypeScript across the monorepo                     |
| `npm run lint`       | ESLint across the monorepo                         |
| `npm run test`       | Vitest suites for shared, server and client        |
| `npm run format`     | Prettier write                                     |
| `npm run setup:env`  | Generates `server/.env` with random secrets        |
| `npm run db:migrate` | Applies Prisma migrations in development           |
| `npm run db:seed`    | Seeds the database                                 |
| `npm run db:studio`  | Opens Prisma Studio                                |

---

## Money and accounting

Every monetary value is stored as a **whole number of so'm** (UZS). UZS has no circulating
subunit and furniture prices reach tens of millions, so integers stay far inside
`Number.MAX_SAFE_INTEGER` while eliminating the floating-point drift that would otherwise
accumulate across a monthly report.

All arithmetic goes through `shared/src/utils/money.ts`. Amounts display as `9 500 000 so'm`.

Accounting fields are kept separate on purpose — product cost is never mixed with business
expenses:

```
grossProfit   = salePrice - costPrice
netSaleProfit = salePrice - costPrice - sellerBonus - installationCost - deliveryCost - otherSaleCosts
```

---

## Multi-store architecture

Every business record carries a `storeId`, and every query is scoped to the authenticated
user's store. One store is in use today, but the data model and the authorisation layer are
built so additional stores — and later the V3 SaaS control plane — need no rewrite.

A user must never be able to read or write another store's data.

---

## Environment variables

See `.env.example` for the annotated reference. The API validates its configuration at
startup with Zod and refuses to boot with a clear message if anything is missing or too weak.

| Variable                              | Purpose                                       |
| ------------------------------------- | --------------------------------------------- |
| `DATABASE_URL`                        | PostgreSQL connection string                  |
| `JWT_ACCESS_SECRET` / `..._REFRESH_..`| Token signing keys (32+ characters)           |
| `COOKIE_SECRET`                       | Cookie signing key                            |
| `COOKIE_SECURE`                       | `true` when serving over HTTPS                |
| `CORS_ORIGIN`                         | Comma-separated allowed browser origins       |
| `STORAGE_DRIVER`                      | `local`, `cloudinary` or `supabase`           |
| `PORT`                                | API port, defaults to 4000                    |
