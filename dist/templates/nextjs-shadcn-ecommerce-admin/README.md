# {{name}}

A single-tenant-per-deployment ecommerce monorepo: a public storefront + admin
console (`apps/web`, Next.js/shadcn) backed by an Express/TypeScript API
(`apps/api`) with a dLocal Go checkout/webhook integration, catalog CRUD,
atomic stock management, and read-only order administration.

This template differs from two other `create-coliapp` templates you may have
seen: it is not `nextjs-kumo-console` (a **multitenant**, Kumo UI-based admin
console with no storefront and no payments integration), and it is not the
bare `nextjs15-biome-shadcn` (frontend only, no backend at all). This template
ships a full-stack monorepo for one specific client's ecommerce site.

## Layout

ADR 0029 monorepo (`pnpm-workspace.yaml` + Turborepo):

- `apps/api` — Express/TypeScript backend (colidevs' `express-ts` conventions
  + a dLocal Go checkout/webhook integration + a catalog/stock/orders domain).
  RFC 9457 error shaping, Zod-`.meta()`-annotated schemas feeding a generated
  OpenAPI spec, Drizzle over plain Postgres (RLS forced on every table),
  ADR 0041 boot-time env validation.
- `apps/web` — Next.js/shadcn storefront (`(ecommerce)` route group: catalog,
  product detail, cart, checkout, checkout-return) + admin console
  (`(adm)` route group: CASL-gated products/categories/product-images/stock
  CRUD + read-only order viewing), Server Actions as the only client of
  `apps/api`.

## Client-name substitution

`create-coliapp`'s scaffolder replaces every `{{name}}` token with the
project name you supply, via a glob over **non-dot paths only**
(`replaceName`, `create-coliapp/index.ts`) — it does not use `dot: true`, so
any dot-prefixed path (`.husky/**`, `.github/workflows/**`, `.vscode/**`,
`.gitignore`, `.npmrc.template`) is never touched by this substitution. This
template does not place `{{name}}` in any of those paths in the first place
(confirmed: `rg '{{name}}' .husky .github .vscode` inside this template
returns no matches), so there is nothing to manually fix afterward — but if
you ever add content to one of those paths yourself, remember it will keep
any `{{name}}` literal you type there verbatim; it is not a bug in your own
future edit, it is how the scaffolder is designed to work.

The token is substituted in (non-exhaustive, see `sdd/ecommerce-admin-template/design`'s
Parameterization table for the full list): root `package.json` (`name`),
`apps/api/package.json` (`{{name}}-api`), `apps/web/package.json`
(`{{name}}-web`), `apps/api/scripts/generate-openapi.ts`'s `info.title`, this
README's own heading, and `apps/api/drizzle/MIGRATIONS.md`'s intro line.
**`apps/api/openapi/openapi.yaml`'s `title` field is generated, not
hand-substituted** — after scaffolding, run
`pnpm --filter ./apps/api generate:openapi` (or let CI's
`generate:openapi:check` catch drift) so the committed spec's title matches
your project name.

Environment variable **names** (`DLOCAL_*`, `DATABASE_RUNTIME_URL`, etc.) are
never parameterized — Infisical scopes secrets by project path
(`--path=/api`), not by name prefix
(`.claude/rules/secrets-management.md` in hefesto, if you have that repo
checked out; otherwise this is just a statement of fact about this
template's own env var naming).

## What this template includes

- **Storefront**: public catalog browse, product detail, cart (Zustand +
  `persist`), checkout (creates a dLocal Go checkout session tied to a
  persisted order), checkout-return page reflecting current order status.
- **Admin console**: CASL-gated (both Server Action and API service layer —
  never a UI-only restriction) CRUD for products, categories, and
  product-images; read+update for stock levels; read-only order viewing
  (order status changes exclusively via the dLocal webhook, there is no
  admin-initiated order-status-change endpoint).
- **dLocal Go payments**: checkout session creation, bespoke HMAC-SHA256
  webhook signature verification (`apps/api/src/v1/modules/Dlocal/signature.ts`
  — deliberately not `@colidevs/api-kit`'s `tsV1SignaturePreset`, which is
  wire-incompatible with dLocal's actual signature scheme), idempotent
  webhook processing (DB-unique-constraint-based replay detection).
- **Stock management**: atomic conditional-`UPDATE` decrement/restore — never
  a SELECT-then-UPDATE race.

## Single-tenant scope

Unlike `express-ts`'s own multitenant-by-default posture (ADR 0014), none of
this template's domain tables (`categories`, `products`, `product_images`,
`orders`) carry a `tenant_id` column. This template targets one client per
deployment. RLS is still enabled and forced on every table as defense in
depth, with an unconditional (`USING (true)`) policy predicate rather than a
tenant comparison. See `apps/api/drizzle/MIGRATIONS.md`'s "No `tenant_id`,
deliberately" section for the full reasoning.

## Database migrations — authored and reviewed, not live-tested here

Migrations under `apps/api/drizzle/` are generated DB-lessly
(`pnpm db:generate`, i.e. `drizzle-kit generate` diffing `schema.ts` against
the last snapshot) and CI-checked for drift
(`db:generate:check`) — but **none of them has been applied against a live
Postgres instance as part of building this template.** They are applied only
at deploy time, by the dedicated `app_migrator` role, as a deliberate manual
first-deploy step. Read `apps/api/drizzle/MIGRATIONS.md` in full before your
first real deploy — it is the authoritative source on this, not this README.

## Running locally

```bash
pnpm install
pnpm dev
```

Root scripts run through Turborepo's task graph (`turbo run <task>` —
`build`, `dev`, `lint`, `check-types`, `test`, `db:generate:check`,
`generate:openapi:check`). Apps are never invoked directly; see
`turbo.json` for the full task list.

`pnpm dev` needs real values for every environment variable each app
validates at boot. **Do not copy a list from this README** — both apps fail
fast and name every missing/invalid variable, and the schema is the only
place that can't silently drift out of sync with what's actually required:

- `apps/api/src/config.ts` — its `envSchema` (Zod, ADR 0041) is the
  authoritative list for the API: database URLs (`DATABASE_RUNTIME_URL`,
  `DATABASE_OWNER_URL`), Better Auth (`BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`), `SERVICE_KEY`, `CORS_ALLOWED_ORIGINS`, `SECRET_KEY`,
  and the `DLOCAL_*` set (API URL/key/secret, notification/success/back
  URLs, default currency/country). `REDIS_URL` is optional.
- `apps/web/src/env.ts` — its `createEnv()` call (`@t3-oss/env-nextjs`,
  ADR 0041) is the authoritative list for the frontend: `API_BASE_URL`,
  `SERVICE_KEY`, `API_MOCKING`, and the client-exposed
  `NEXT_PUBLIC_API_BASE_URL`.

If you scaffold this template and immediately run `pnpm build` with no `.env`
in place at all (the real state of a brand-new project before any secrets are
wired up), expect both apps' boot-time validation to fail loudly and name
every missing variable — this is the intended behavior (ADR 0041), not a
template defect. Set up local secrets per
`.claude/rules/secrets-management.md`'s Infisical convention if you have
hefesto's conventions available, or hand-seed a `.env` per app for a quick
local spike.

## Licensing

Two LICENSE files, one per app: `apps/api/LICENSE` (Apache-2.0) and
`apps/web/LICENSE` (MIT). No single root LICENSE — see this template's own
design record (`sdd/ecommerce-admin-template/design`, decision A7) for why.
