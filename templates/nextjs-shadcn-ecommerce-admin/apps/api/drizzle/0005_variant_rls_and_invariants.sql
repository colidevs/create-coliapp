-- `sdd/ecommerce-product-variants/design` — hand-written `--custom`
-- migration, same convention as `0001_rls_roles.sql`/`0002`/`0003`
-- (schema-diffing has nothing to diff against for RLS/role wiring or a
-- constraint trigger; `drizzle-kit generate --custom` was used to reserve
-- this slot in `meta/_journal.json` with no snapshot delta).
--
-- Two halves:
--   1. RLS + GRANTs for the 4 new tables (`product_variants`,
--      `variant_option_types`, `variant_option_values`,
--      `variant_option_selections`) — `0001_rls_roles.sql`'s own
--      ENABLE/FORCE/`CREATE POLICY ... USING (true)`/GRANT block, extended
--      unchanged. Same single-tenant deviation applies (no `tenant_id`
--      column on any of the 4 new tables) — see that migration's own header
--      comment for the full rationale; not restated here.
--   2. The published-product invariant: an active/published product MUST
--      have at least one active variant (spec requirement, design D3).
--      Enforced by a `DEFERRABLE INITIALLY DEFERRED` constraint trigger, not
--      a plain `CHECK` (a `CHECK` cannot reference another table) and not a
--      plain (non-deferred, non-constraint) `AFTER` trigger (which would
--      reject "create product, then add its default variant" as two
--      separate statements within one transaction, even though the
--      invariant holds again at COMMIT). `raise exception ... using errcode
--      = '23514'` reuses Postgres's own real `check_violation` SQLSTATE, so
--      the app-side detection in `admin/products/repository.ts`
--      (`isCheckViolation`) is a genuine, not synthetic, Postgres error
--      code — matching this file's own `23505`-detection convention already
--      established by `DuplicateSlugHttpError`.

ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE "product_variants" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY app_runtime_access ON "product_variants"
	USING (true);
--> statement-breakpoint

ALTER TABLE "variant_option_types" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE "variant_option_types" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY app_runtime_access ON "variant_option_types"
	USING (true);
--> statement-breakpoint

ALTER TABLE "variant_option_values" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE "variant_option_values" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY app_runtime_access ON "variant_option_values"
	USING (true);
--> statement-breakpoint

ALTER TABLE "variant_option_selections" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE "variant_option_selections" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY app_runtime_access ON "variant_option_selections"
	USING (true);
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "product_variants", "variant_option_types", "variant_option_values", "variant_option_selections" TO app_runtime;
--> statement-breakpoint

-- Published-product invariant (spec: "Published-product variant
-- invariant"; design D3, munod 0029 precedent). One trigger function is
-- shared by both trigger definitions below, fired against two
-- differently-shaped tables (`products` has no `product_id` column;
-- `product_variants` has no `is_active`-on-the-product semantics of its
-- own). Resolving the product id via a blind
-- `coalesce(new.product_id, new.id, old.product_id)` — as an earlier draft
-- of this migration did — fails at runtime with "record 'new' has no field
-- 'product_id'" the moment the function fires on `products`: PL/pgSQL
-- resolves a RECORD field reference against the ACTUAL row shape at
-- runtime, and `new`/`old` are typed per the table that fired the trigger,
-- not a shared shape across both. Verified live against a real Postgres 17
-- container, not assumed. `TG_TABLE_NAME`/`TG_OP` branching below only ever
-- accesses a field that genuinely exists on the row for that branch —
-- `new.id` is only read on the `products` branch, `old.product_id`/
-- `new.product_id` only on the `product_variants` branch, and `new` itself
-- is never referenced at all when `TG_OP = 'DELETE'` (also verified live:
-- referencing `new` inside a DELETE trigger raises "record 'new' is not
-- assigned yet", a second, independent instance of this exact same class
-- of bug the naive `coalesce` approach has).
create function public.assert_product_has_active_variant() returns trigger as $$
declare
	v_product_id uuid;
begin
	if TG_TABLE_NAME = 'products' then
		v_product_id := new.id;
	elsif TG_OP = 'DELETE' then
		v_product_id := old.product_id;
	else
		v_product_id := new.product_id;
	end if;

	if exists (
		select 1 from products p
		where p.id = v_product_id
			and p.is_active
			and not exists (
				select 1 from product_variants v
				where v.product_id = p.id and v.is_active
			)
	)
	then
		raise exception 'product % has no active variant', v_product_id
			using errcode = '23514';
	end if;

	return null;
end;
$$ language plpgsql;
--> statement-breakpoint

-- Fires when a product is inserted already active, or flipped active via
-- UPDATE — covers the "publish" transition.
create constraint trigger trg_product_requires_active_variant
	after insert or update of is_active on products
	deferrable initially deferred
	for each row execute function public.assert_product_has_active_variant();
--> statement-breakpoint

-- Fires when a variant is deactivated/deleted — covers "the last active
-- variant of an already-published product is removed/deactivated".
create constraint trigger trg_variant_keeps_product_publishable
	after update or delete on product_variants
	deferrable initially deferred
	for each row execute function public.assert_product_has_active_variant();
