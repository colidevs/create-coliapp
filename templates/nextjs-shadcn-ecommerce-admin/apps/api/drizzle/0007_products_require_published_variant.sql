-- `sdd/ecommerce-product-variants` apply PR22 — hand-written `--custom`
-- migration (same convention as `0001`/`0005`: schema-diffing has nothing
-- to diff against for a backfill statement or a trigger-definition change).
--
-- Fixes a real, confirmed bug: `is_active` was conflating two incompatible
-- meanings — the soft-delete marker (`admin/products/repository.ts`'s
-- `deleteOne()`) AND, per an earlier revision of `schema.ts`'s own doc
-- comment, the draft/publish gate. A soft-deleted product and a
-- still-drafting one were indistinguishable under one boolean.
--
-- `0006_talented_grey_gargoyle.sql` (auto-diffed) already added the new
-- `is_published` column (`DEFAULT false`) and flipped `is_active`'s own
-- column default to `true`. This migration does the two things schema
-- diffing cannot express:
--   1. Backfill existing rows so the split is semantically sound.
--   2. Extend `trg_product_requires_active_variant`/
--      `trg_variant_keeps_product_publishable`
--      (`0005_variant_rls_and_invariants.sql`) to require `is_published`
--      too — matching munod's real, separately-decided
--      `check_product_has_active_variant()` precedent verbatim
--      (`munod/db/migrations/0029_enforce_product_has_active_variant.sql:14`:
--      `IF v_is_published IS NOT TRUE OR v_is_active IS NOT TRUE THEN
--      RETURN; END IF;`).

-- Backfill (best-effort, no history to recover a genuine soft-delete from —
-- `deleteOne()` is a feature this same change stack only just added, and no
-- other code path ever set `is_active: false`; the far likelier prior state
-- for any `is_active = false` row is "still a draft, never soft-deleted"):
--   - `is_published` inherits the OLD `is_active` value first (the prior
--     invariant trigger only ever allowed `is_active = true` when the
--     product already had an active variant, so this preserves exactly
--     which products were genuinely "published" under the old scheme).
--   - `is_active` (the NEW soft-delete-only meaning) is then reset to
--     `true` for every row — i.e. "not deleted" — since nothing in this
--     schema's history can distinguish an intentionally soft-deleted row
--     from a plain draft once they shared one boolean.
UPDATE "products" SET "is_published" = "is_active";
--> statement-breakpoint

UPDATE "products" SET "is_active" = true;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.assert_product_has_active_variant() RETURNS trigger AS $$
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
			and p.is_published
			and not exists (
				select 1 from product_variants v
				where v.product_id = p.id and v.is_active
			)
	)
	then
		raise exception 'product % is published and active but has no active variant', v_product_id
			using errcode = '23514';
	end if;

	return null;
end;
$$ language plpgsql;
--> statement-breakpoint

-- `CREATE CONSTRAINT TRIGGER` has no `ALTER`-column-list equivalent — the
-- trigger must be dropped and recreated to widen its `UPDATE OF` column
-- list to include `is_published` alongside the existing `is_active`.
DROP TRIGGER trg_product_requires_active_variant ON products;
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER trg_product_requires_active_variant
	after insert or update of is_active, is_published on products
	deferrable initially deferred
	for each row execute function public.assert_product_has_active_variant();
--> statement-breakpoint

-- `trg_variant_keeps_product_publishable` (fires from `product_variants`,
-- never reads `is_published` off its own row) needs no column-list change —
-- only the shared function body above changed, and `CREATE OR REPLACE
-- FUNCTION` already updated it in place for both triggers.
