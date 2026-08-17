-- ADR 0014 / design D4: two Postgres roles + FORCE ROW LEVEL SECURITY.
--
-- Rationale (see src/lib/db/session.ts for the app-side half of this):
-- - Table owners and superusers bypass RLS by default, even with RLS
--   enabled, UNLESS the table also has FORCE ROW LEVEL SECURITY. The
--   migration/owner role below creates and owns every table, so FORCE is
--   mandatory here, not optional hardening.
-- - The runtime role is created with NOBYPASSRLS explicitly (the Postgres
--   default for a newly created role already has no BYPASSRLS attribute,
--   but it is stated explicitly here so this migration is self-documenting
--   and does not rely on an implicit default silently continuing to hold).
-- - The runtime role must NOT own these tables (ownership itself grants an
--   RLS bypass), so all access must come through explicit GRANTs.

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
		CREATE ROLE app_runtime NOBYPASSRLS LOGIN PASSWORD 'change_me_in_infisical';
	END IF;
END
$$;
--> statement-breakpoint

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Fail-closed by construction, covering BOTH ways "no tenant context" shows
-- up in practice (verified against a real Postgres 16 while building this
-- migration, not assumed from docs alone):
--
-- 1. `current_setting('app.tenant_id', true)` (missing_ok = true) returns
--    NULL the FIRST time a connection is used and `app.tenant_id` was never
--    referenced on it — `NULL = tenant_id` is NULL (falsy), zero rows.
-- 2. On a connection that has ALREADY run at least one `withTenantSession`
--    transaction, Postgres does NOT revert a transaction-local
--    `set_config(..., true)` back to "unset/NULL" after COMMIT — it
--    reverts to `''` (empty string), because referencing a custom GUC once
--    materializes it as a real, session-scoped placeholder parameter.
--    `''::uuid` THROWS (`invalid input syntax for type uuid`).
--
-- A first attempt guarded case 2 with `current_setting(...) <> '' AND
-- tenant_id = current_setting(...)::uuid`, assuming left-to-right
-- short-circuit — reproduced against a real Postgres 16 that this
-- assumption is WRONG: Postgres's docs explicitly do not guarantee
-- evaluation order for AND/OR, and the cast still ran and still threw.
-- `NULLIF(value, '')` sidesteps the ordering question entirely: it turns
-- `''` into a real SQL `NULL` BEFORE any cast is attempted, so `::uuid`
-- only ever receives a genuine UUID string or NULL — verified never to
-- throw for either the never-set (NULL) or reset-after-commit ('') case.
CREATE POLICY tenant_isolation ON "orders"
	USING (
		tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
	);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "orders" TO app_runtime;
--> statement-breakpoint

-- `set_config`/`current_setting` on a custom `app.*` GUC namespace need no
-- extra grant — any role can read/write its own session-local GUC values,
-- this GRANT only scopes actual table access.
