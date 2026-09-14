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
--
-- **Corrected (found by a real pilot build, `ecommerce-admin-template`
-- PR10): `app_runtime` is no longer CREATEd here.** This migration is
-- applied through `DATABASE_OWNER_URL` — `app_migrator` connected with an
-- auto `SET ROLE app_owner` (see `drizzle.config.ts`) — and Postgres role
-- ATTRIBUTES (like CREATEROLE), unlike privileges, are never inherited via
-- membership. `app_owner` deliberately has no CREATEROLE attribute of its
-- own (granting it as a standing attribute would itself be a
-- privilege-escalation surface — the same class of concern
-- `backend-template-stack.md`'s `app_migrator` addendum already exists to
-- close), so a `CREATE ROLE` statement running as `app_owner` always fails
-- with "permission denied to create role" on any Postgres instance that
-- actually enforces least privilege — this is not an environment-specific
-- fluke. `app_runtime` (and `app_owner`/`app_migrator` themselves) are now
-- provisioned ONCE, by the Postgres superuser, via the standalone
-- `drizzle/bootstrap-roles.sql` — see that file and this directory's
-- `MIGRATIONS.md` ("Role bootstrap" section) for the mandatory one-time
-- step that MUST run before this migration. Everything below only ALTERs
-- tables and GRANTs against an already-existing role, both of which
-- `app_owner` (the table owner) can do without CREATEROLE.
--
-- **Deviation from `templates/express-ts`'s own `0001_rls_roles.sql`
-- (`sdd/ecommerce-admin-template/design`, orchestrator-recorded)**: this
-- template's four tables (`categories`, `products`, `product_images`,
-- `orders`) carry NO `tenant_id` column — a single-tenant-per-deployment
-- client project (munod precedent), not ADR 0014's multi-tenant default.
-- RLS is still ENABLEd and FORCEd on every table (defense in depth: a
-- future connection using the owner/migrator role by mistake is still
-- blocked from an implicit bypass), but the policy predicate is
-- unconditional (`USING (true)`) rather than a tenant-scoping comparison —
-- there is no tenant dimension to filter on. Access control for these
-- tables is CASL, at the service layer (Phase 3), not a Postgres policy.

ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY app_runtime_access ON "categories"
	USING (true);
--> statement-breakpoint

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE "products" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY app_runtime_access ON "products"
	USING (true);
--> statement-breakpoint

ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE "product_images" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY app_runtime_access ON "product_images"
	USING (true);
--> statement-breakpoint

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY app_runtime_access ON "orders"
	USING (true);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "categories", "products", "product_images", "orders" TO app_runtime;
