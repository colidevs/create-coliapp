# Migrations for `{{name}}-api`

This directory's migrations are **authored, reviewed, and committed — but not
applied against any live database in this environment.** No migration in this
template has been run against a real Postgres instance as part of scaffolding
this project. Say this honestly, not implicitly: authoring a migration file
is not the same claim as verifying it against a live database.

**Update (`ecommerce-admin-template` PR10):** a real pilot build DID run the
full migration sequence end to end against a fresh, throwaway Postgres 17
container — the first time this happened for this template. That pass found
and fixed a real, blocking bug (see "Role bootstrap" below) in
`0001_rls_roles.sql`. The claim above ("not applied against any live
database") describes the state of this template's own scaffolding process,
which still never runs migrations itself — it does not mean the migrations
were never smoke-tested by anyone; PR10 is that smoke test.

**Update (`ecommerce-product-variants` PR1):** `0004_*.sql` and
`0005_variant_rls_and_invariants.sql` were also independently verified
end to end against a fresh, throwaway Postgres 17 container as part of
authoring this PR — `bootstrap-roles.sql`, then the full `0000`-`0005`
sequence via `DATABASE_OWNER_URL`, applied cleanly with no manual
intervention. That same session also confirmed
`trg_product_requires_active_variant`/`trg_variant_keeps_product_publishable`
(below) genuinely reject an active product with zero active variants at
COMMIT, and genuinely allow one when its default variant is inserted in the
same transaction (the deferred check passing). The container was torn down
afterward — same as PR10, this is a one-time authoring-time smoke test, not
a standing fixture. This template's own scaffolding process still never
runs any migration itself (unchanged from the description above); CI does
not apply these migrations either — `db:generate:check` only re-diffs
`schema.ts` against the committed `drizzle/` directory (DB-less), it never
connects to a database. Real application only happens at deploy time, per
"Deploy-time application, exclusively" below.

## Role bootstrap (mandatory, one-time, run as the Postgres superuser)

**Before running `pnpm db:migrate` for the first time against a database,
run `drizzle/bootstrap-roles.sql` against it, connected as the Postgres
superuser (or an equivalent CREATEROLE-holding role):**

```sh
psql "postgres://<superuser>@<host>:5432/<db>" -f drizzle/bootstrap-roles.sql
```

This creates the 3 roles ADR 0014 / design D4 requires (`app_owner`,
`app_migrator`, `app_runtime`) before any migration runs. It is intentionally
**not** a numbered `drizzle/` migration — every migration here is applied
through `DATABASE_OWNER_URL` (`app_migrator`, auto `SET ROLE app_owner`), and
both of those roles must already exist for that connection string to work at
all. `bootstrap-roles.sql` is the one step that breaks that chicken-and-egg
cycle; see that file's own header comment for the full rationale and for why
`0001_rls_roles.sql` no longer creates `app_runtime` itself (it used to, and
that `CREATE ROLE` always failed with "permission denied to create role" —
found live by PR10's pilot build, the first time any fresh-Postgres run of
this template's migrations was ever attempted).

This step is idempotent and safe to re-run.

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
- `0004_chubby_nico_minoru.sql` (`sdd/ecommerce-product-variants/design`) IS
  a normal schema-diffed migration — `drizzle-kit generate`'s own randomly
  assigned name, kept verbatim rather than hand-renamed (the design's own
  `drizzle/0004_product_variants.sql` filename was illustrative only; task
  1.2 requires generating the real migration via `drizzle-kit generate`,
  not hand-authoring or hand-renaming its output). It creates
  `product_variants`, `variant_option_types`, `variant_option_values`,
  `variant_option_selections`, and ALTERs `products`/`product_images`
  (drops `products.code`/`alt_code`/`price`/`stock`/`stock_min`, widens
  `product_images.product_id` to nullable, adds `product_images.variant_id`
  and its `chk_image_owner` CHECK). `0005_variant_rls_and_invariants.sql`
  is a `--custom` migration, same convention as `0001`-`0003`: RLS/GRANTs
  for the 4 new tables (extending `0001_rls_roles.sql`'s own block
  unchanged), plus the `DEFERRABLE INITIALLY DEFERRED` constraint trigger
  enforcing "an active product needs ≥1 active variant" (spec requirement,
  design D3, munod 0029 precedent) — see that file's own header comment for
  the full mechanism.
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
to run DDL) — **after** the one-time role bootstrap above has run. `db:migrate`
(`drizzle-kit migrate`) is never invoked from a developer's own machine and
never run by this repository's CI — it is a manual, deliberate first-deploy
step against the target environment's real `DATABASE_OWNER_URL`, run once
`bootstrap-roles.sql` has already provisioned `app_owner`/`app_migrator`/
`app_runtime` on that database.

PR10 independently verified this template's own migrations
(`0000`-`0003`, plus the role bootstrap) against a fresh, throwaway Postgres
17 container — `bootstrap-roles.sql`, then `drizzle-kit migrate` via
`DATABASE_OWNER_URL`, applied cleanly end to end with no manual intervention
beyond the documented bootstrap step. Better Auth's own schema (`0002`/
`0003`) was exercised as part of that same run — it is also reproduced
verbatim from `templates/express-ts`'s own migrations, which were
separately, independently smoke-tested there (see that template's own
migration file header comments). `ecommerce-product-variants` PR1
extended this same live verification to `0004`/`0005` — see the update note
at the top of this file.

## No `tenant_id`, deliberately

Unlike `templates/express-ts`'s own sample `orders` table, none of this
template's domain tables — the original four (`categories`, `products`,
`product_images`, `orders`) or the four `sdd/ecommerce-product-variants`
added (`product_variants`, `variant_option_types`, `variant_option_values`,
`variant_option_selections`) — carry a `tenant_id` column or a
tenant-scoping RLS predicate — this template targets a
single-tenant-per-deployment client project (an explicit, orchestrator-
recorded deviation from ADR 0014's multi-tenant-by-default posture; see
`sdd/ecommerce-admin-template/design`). RLS is still enabled and forced on
every table as defense in depth; the policy predicate is simply
unconditional (`USING (true)`) rather than a tenant comparison.
