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

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
		CREATE ROLE app_runtime NOBYPASSRLS LOGIN PASSWORD 'change_me_in_infisical';
	END IF;
END
$$;
--> statement-breakpoint

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
