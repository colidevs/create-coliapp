-- One-time Postgres role bootstrap for `{{name}}-api` — ADR 0014 / design
-- D4's 3-role split (`app_owner`/`app_runtime`/`app_migrator`).
--
-- **Run this file exactly once per database, connected as the Postgres
-- SUPERUSER (or an equivalent role holding CREATEROLE), BEFORE `pnpm
-- db:migrate` (or any `drizzle-kit migrate` invocation) is ever run against
-- that database.** It is deliberately NOT a numbered `drizzle/` migration:
-- every migration in this directory is applied through `DATABASE_OWNER_URL`
-- — `app_migrator` connecting with an auto `SET ROLE app_owner` via the
-- connection string's `options` param (see `drizzle.config.ts`) — and BOTH
-- of those roles must already exist for that connection string to work at
-- all. No migration file can create the very roles its own connection
-- depends on; this file is the one explicit, human-run step that breaks
-- that cycle.
--
-- Why this exists (found by a real pilot build, `ecommerce-admin-template`
-- PR10 — the first time this template was ever run against a live,
-- freshly-created Postgres instance): `drizzle/0001_rls_roles.sql` used to
-- `CREATE ROLE app_runtime` directly, inside the migration itself. That
-- statement runs AS `app_owner` (via `app_migrator`'s `SET ROLE`), and
-- Postgres role ATTRIBUTES — unlike privileges — are never inherited
-- through membership. `app_owner` has no CREATEROLE attribute (by design:
-- granting it as a standing attribute would itself be a
-- privilege-escalation surface, the same class of concern
-- `backend-template-stack.md`'s `app_migrator` addendum already exists to
-- close), so that `CREATE ROLE` failed with "permission denied to create
-- role" on every fresh Postgres instance that actually enforces least
-- privilege — not a one-off, environment-specific failure.
--
-- Idempotent: safe to re-run against a database that already has some or
-- all of these roles (each block is guarded by `IF NOT EXISTS`).
--
-- Every password below is a placeholder. Replace with a real, generated
-- secret at bootstrap time and store it in Infisical
-- (`.claude/rules/secrets-management.md`) — never commit a real password
-- to this file or anywhere else in the repo.
--
-- Example invocation (adjust host/db for the real target):
--
--   psql "postgres://<superuser>@<host>:5432/<db>" -f drizzle/bootstrap-roles.sql

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_owner') THEN
		-- NOLOGIN — table owner only, never connected to directly. Migrations
		-- reach it exclusively via `app_migrator`'s `SET ROLE app_owner`
		-- (`DATABASE_OWNER_URL`'s `options=-c%20role=app_owner` connection
		-- param). No CREATEROLE attribute — see the rationale above and in
		-- `0001_rls_roles.sql`.
		CREATE ROLE app_owner NOLOGIN;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_migrator') THEN
		-- LOGIN, member of app_owner via IN ROLE — CI/deploy-exclusive, NEVER
		-- used by the running app itself. Membership grants app_owner's
		-- table-DDL privileges for the duration of a `SET ROLE`; it does NOT
		-- grant app_owner's role ATTRIBUTES (there are none to inherit here,
		-- since app_owner itself has no CREATEROLE — see above).
		CREATE ROLE app_migrator LOGIN PASSWORD 'change_me_in_infisical' IN ROLE app_owner;
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
		-- LOGIN, request-time role used by the running app
		-- (`DATABASE_RUNTIME_URL`, `src/lib/db/client.ts`). NOBYPASSRLS is
		-- stated explicitly (already the default for a newly created role,
		-- restated here so this file is self-documenting and does not rely
		-- on an implicit default silently continuing to hold — the same
		-- discipline the migration this replaces originally established).
		CREATE ROLE app_runtime NOBYPASSRLS LOGIN PASSWORD 'change_me_in_infisical';
	END IF;
END
$$;

-- Second, distinct gap found in the SAME end-to-end verification pass:
-- creating the roles alone is not enough. `app_owner` does not automatically
-- gain CREATE on the target database, nor on its `public` schema — Postgres
-- 15+ no longer grants CREATE on `public` to PUBLIC by default (only the
-- schema owner / `pg_database_owner` membership has it), and a role gains no
-- privilege on a database it does not own. Without both grants below,
-- `drizzle-kit migrate`'s own internal `CREATE SCHEMA IF NOT EXISTS
-- "drizzle"` bookkeeping step (and this template's own `0000_init.sql`,
-- which creates its domain tables unqualified, i.e. in `public`) both fail
-- with "permission denied for database ..." even after the role-creation fix
-- above. This script MUST be run while connected TO the target database
-- (per the invocation example below) — dynamic SQL is used for the database
-- grant only because `GRANT ... ON DATABASE` takes a literal identifier, not
-- an expression, and this script is meant to run unmodified against any
-- target database name.
DO $$
BEGIN
	EXECUTE format('GRANT CREATE ON DATABASE %I TO app_owner', current_database());
END
$$;

GRANT CREATE ON SCHEMA public TO app_owner;
