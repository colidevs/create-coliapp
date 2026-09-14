# Migrations for `{{name}}-api`

This directory's migrations are **authored, reviewed, and committed — but not
applied against any live database in this environment.** No migration in this
template has been run against a real Postgres instance as part of scaffolding
this project. Say this honestly, not implicitly: authoring a migration file
is not the same claim as verifying it against a live database.

## How migrations are authored

- `pnpm db:generate` (`drizzle-kit generate`) is **DB-less** — it diffs
  `src/lib/db/schema.ts` against the last recorded snapshot in
  `drizzle/meta/*.json` and emits a new `.sql` file. It never connects to a
  database, so authoring a migration requires no live Postgres instance.
- `0000_init.sql` and `0001_rls_roles.sql` cover this template's own domain
  tables (`categories`, `products`, `product_images`, `orders`) —
  `0001_rls_roles.sql` is a `drizzle-kit generate --custom` migration
  (schema-diffing has nothing to diff against for a hand-authored RLS/role
  migration), same convention as `0002`/`0003` below.
- `0002_better_auth_core_tables.sql` and
  `0003_better_auth_organization_tables.sql` are also `--custom` migrations,
  reproduced from `templates/express-ts`'s own equivalents — Better Auth
  manages its own tables (`user`/`session`/`account`/`verification`/`jwks`/
  `organization`/`member`/`invitation`) through its built-in Kysely/`pg`
  adapter (`src/lib/auth.ts`), independent of `schema.ts`, so `drizzle-kit
  generate`'s normal schema-diffing cannot produce them.
- `db:generate:check` (`scripts/db-generate-check.mjs`, wired into CI) only
  verifies that `schema.ts` and the committed `drizzle/` directory are in
  sync — it re-runs `drizzle-kit generate` and fails the build if that
  produces an uncommitted diff. It does **not** apply anything to a
  database, live or otherwise.

## Deploy-time application, exclusively

Migrations in this directory are applied **only at deploy time**, by the
`app_migrator` role (`.claude/rules/backend-template-stack.md`'s 3-role
split: `app_owner` owns the tables, `app_runtime` is the request-time
`NOBYPASSRLS` role, `app_migrator` is the CI/deploy-exclusive role permitted
to run DDL). `db:migrate` (`drizzle-kit migrate`) is never invoked from a
developer's own machine and never run by this repository's CI — it is a
manual, deliberate first-deploy step against the target environment's real
`DATABASE_OWNER_URL`.

Until that first deploy happens, treat every statement in this directory as
**reviewed, but unexecuted** — the RLS/role bootstrap logic
(`0001_rls_roles.sql`'s `CREATE ROLE ... IF NOT EXISTS` guard, the `FORCE ROW
LEVEL SECURITY` calls, the `app_runtime_access` policies) has not been
exercised against a real Postgres instance as part of this template's own
scaffolding work, and neither has Better Auth's own schema
(`0002`/`0003`) — even though the latter is reproduced verbatim from
`templates/express-ts`'s own migrations, which **were** independently smoke-
tested there (see that template's own migration file header comments).

## No `tenant_id`, deliberately

Unlike `templates/express-ts`'s own sample `orders` table, none of this
template's four domain tables carry a `tenant_id` column or a
tenant-scoping RLS predicate — this template targets a
single-tenant-per-deployment client project (an explicit, orchestrator-
recorded deviation from ADR 0014's multi-tenant-by-default posture; see
`sdd/ecommerce-admin-template/design`). RLS is still enabled and forced on
every table as defense in depth; the policy predicate is simply
unconditional (`USING (true)`) rather than a tenant comparison.
