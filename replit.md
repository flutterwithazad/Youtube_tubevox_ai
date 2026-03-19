# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### `artifacts/admin` — Admin Panel (at `/admin/`)
React + Vite full admin panel. Secured by bcrypt + JWT (httpOnly cookie `admin_token`).
- **Auth**: POST `/api/admin/auth/login` → bcrypt verify → JWT signed with `ADMIN_JWT_SECRET` stored as httpOnly cookie
- **Pages**: Login, Overview (with Recharts charts), Users (list + detail with 6 tabs), Jobs, Payments, Plans, Packages, API Keys, Settings, Announcements, IP Blocklist, Audit Log, Admins
- **Backend routes**: All at `/api/admin/*` in `artifacts/api-server/src/routes/admin/`
- **Supabase**: All admin calls use `SUPABASE_SERVICE_ROLE_KEY` (server-side only, bypasses RLS)
- **Seed script**: `pnpm --filter @workspace/scripts run seed-admin [email] [password] [name]`
- **Default credentials**: `admin@yourdomain.com` / `Admin@123456` (change after login)
- **Env vars needed**: `ADMIN_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Key files**: `artifacts/admin/src/App.tsx`, `artifacts/admin/src/lib/api.ts`, `artifacts/admin/src/lib/auth-context.tsx`, `artifacts/api-server/src/lib/admin-auth.ts`

### `artifacts/ytscraper-landing` — Marketing Landing Page (at `/`)
React + Vite landing page for YTScraper. All 12 sections: navbar, hero, social proof, features, use cases, dataset preview table, how it works, testimonials, FAQ accordion, pricing, final CTA, footer. Fonts: Syne (headings), DM Sans (body), JetBrains Mono (data). Pure static frontend — no backend or auth.

### `artifacts/dashboard` — User Panel Dashboard (at `/dashboard/`)
React + Vite SaaS dashboard connected to Supabase (auth + database).
- **Auth**: Login/Signup via Supabase (email/password + Google OAuth)
- **Scrape page**: 3-state UX — URL input → live progress → comment explorer. Calls `fetch-comments` edge function in a chained loop (via `fetch()`) until `done=true`. Real credit balance from `user_credit_balance` view. Cancel writes to `jobs` table. Cost = 1 credit per comment (NOT 1 per 1000).
- **Jobs page**: Real Supabase data. Stats from `credit_ledger` + `jobs`. Inline cancel. Status badges.
- **Job detail page**: Fetches real job row + embedded CommentExplorer
- **Credits page**: Balance from `user_credit_balance` view, packages from `credit_packages` table, history from `credit_ledger`. Free credits from `platform_settings WHERE key='free_plan_credits'` (never hardcoded).
- **Settings page**: Profile fetched/saved from `profiles` table; real `supabase.auth.updateUser()` password change.
- **CommentExplorer**: Real paginated loading (50/page, "Load more"), real sort (likes/newest/oldest), full-fetch exports (fetches ALL comments then downloads). Exports recorded to `exports` table.
- **Topbar**: Live credit balance via `useCredits` hook (polls every 30s from `user_credit_balance`). Unread notification count from `notifications` table.
- **Edge function**: `fetch-comments` (NOT `scrape-comments`). Called with both `Authorization: Bearer` and `apikey` headers. Loops until `result.done === true`.
- **Env vars**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Packages**: `@supabase/supabase-js`, `date-fns`, `xlsx`, `sonner`
- **Key files**: `hooks/use-credits.ts`, `hooks/use-auth.ts`, `lib/utils/export.ts`, `pages/scrape.tsx`, `components/dashboard/CommentExplorer.tsx`, `components/layout/Topbar.tsx`

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   ├── ytscraper-landing/  # Marketing landing page (/)
│   └── dashboard/          # User panel dashboard (/dashboard/)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
