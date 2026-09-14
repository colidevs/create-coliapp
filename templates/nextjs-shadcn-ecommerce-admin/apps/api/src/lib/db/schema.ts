import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

/**
 * @description `admin-catalog-crud` domain. Column set derived from
 * `munod/api/src/v1/modules/stock/types.ts` (`StockSchema` selects
 * `products.category_id`) and the general product/category shape that
 * module's repository queries against.
 *
 * **Deliberately no `tenant_id` column** — an explicit, orchestrator-recorded
 * deviation from ADR 0014's multi-tenant-by-default posture
 * (`.claude/rules/backend-template-stack.md`). This template targets a
 * single-tenant-per-deployment client project, matching munod's own real
 * deployment shape. The 3-role split (`app_owner`/`app_runtime`/
 * `app_migrator`) is kept regardless — see `drizzle/0001_rls_roles.sql`.
 */
export const categories = pgTable("categories", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
});

/**
 * @description `admin-catalog-crud` domain — parent catalog metadata only.
 * `sdd/ecommerce-product-variants/design` MODIFIED this table: every
 * sellable attribute (`code`/`altCode`/`price`/`stock`/`stockMin`) MOVED to
 * `productVariants` below — a product is no longer itself the sellable
 * unit, a variant is. `isActive` default flips `true` -> `false`
 * (design D3): a product is created as a draft and can only be published
 * once it has at least one active variant, enforced by the deferrable
 * constraint trigger in `drizzle/0005_variant_rls_and_invariants.sql`.
 */
export const products = pgTable("products", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	description: text("description"),
	coverImage: text("cover_image"),
	categoryId: uuid("category_id").references(() => categories.id),
	isActive: boolean("is_active").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
});

/**
 * @description `variant-options` domain (NEW, `sdd/ecommerce-product-
 * variants/design`) — the sellable unit. Column set derived from munod
 * `db/migrations/0002_product_variants_schema.sql:3-19`, adapted to this
 * template's conventions and deliberately stripped of munod's
 * pre-generic leftovers (design D2): `size` (the pre-generic column this
 * whole change replaces with generic option types/values), `discount` and
 * `total_price` (no counterpart in this template's single `price` column),
 * and `material_id` (FKs a furniture-specific `materials` table munod
 * itself decommissioned). munod's `unit_price` is renamed `price` — this
 * template's own `products.price` naming convention, one level down.
 */
export const productVariants = pgTable(
	"product_variants",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		productId: uuid("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
		// Nullable — widened from munod's `NOT NULL` (design's own DDL
		// comment): a variant's own SKU-style codes are optional metadata,
		// unlike the parent `products.slug`, which stays the unique
		// human/URL-facing identifier.
		code: text("code"),
		altCode: text("alt_code"),
		price: numeric("price", { precision: 12, scale: 2 }).notNull(),
		/**
		 * @description Negative stock is this template's "untracked
		 * inventory" convention, ported from munod's own repository logic
		 * (`Dlocal/repository.ts:366`) — a negative value intentionally opts
		 * a variant out of the atomic-decrement guard in the `Dlocal`
		 * service, never a data-integrity error to reject. Unchanged in
		 * meaning by this move from `products.stock`.
		 */
		stock: integer("stock").notNull().default(0),
		stockMin: integer("stock_min").notNull().default(0),
		isDefault: boolean("is_default").notNull().default(false),
		isActive: boolean("is_active").notNull().default(true),
		displayOrder: integer("display_order").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	(t) => [
		index("idx_product_variants_product_id").on(t.productId),
		// Design D7 — DB-enforced single-default-variant-per-product, a
		// partial unique index over `is_default`, rather than an app-level
		// check-then-write (`api-caching-resilience.md`).
		uniqueIndex("uq_product_variants_default")
			.on(t.productId)
			.where(sql`${t.isDefault}`),
	],
);

/**
 * @description `variant-options` domain (NEW) — admin-managed option-type
 * vocabulary (e.g. "color", "size"). Zero schema migration/code edit is
 * needed to add a new option type (spec requirement). Deletion is soft
 * (design D6, `isActive: false`) — a bound value must stay resolvable for
 * historical variants, matching `admin/products/repository.ts`'s existing
 * soft-delete convention.
 */
export const variantOptionTypes = pgTable("variant_option_types", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	displayOrder: integer("display_order").notNull().default(0),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
});

/**
 * @description `variant-options` domain (NEW) — the concrete values of an
 * option type (e.g. `color`'s `red`/`blue`). Unique per `(optionTypeId,
 * slug)`, not globally unique — two different option types may each have a
 * value slugged `m`. `onDelete: "cascade"` is retained (design D6) but never
 * exercised by the API — deletion is soft, same as `variantOptionTypes`.
 */
export const variantOptionValues = pgTable(
	"variant_option_values",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		optionTypeId: uuid("option_type_id")
			.notNull()
			.references(() => variantOptionTypes.id, { onDelete: "cascade" }),
		value: text("value").notNull(),
		slug: text("slug").notNull(),
		imageUrl: text("image_url"),
		description: text("description"),
		displayOrder: integer("display_order").notNull().default(0),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	(t) => [
		unique("uq_variant_option_values_type_slug").on(t.optionTypeId, t.slug),
	],
);

/**
 * @description `variant-options` domain (NEW) — composite-PK join recording
 * which option values a variant selects (e.g. variant "red / M" selects
 * `color:red` and `size:m`). No surrogate `id` — the pair itself is the
 * natural key, munod `0002:68-72`.
 */
export const variantOptionSelections = pgTable(
	"variant_option_selections",
	{
		variantId: uuid("variant_id")
			.notNull()
			.references(() => productVariants.id, { onDelete: "cascade" }),
		optionValueId: uuid("option_value_id")
			.notNull()
			.references(() => variantOptionValues.id, { onDelete: "cascade" }),
	},
	(t) => [primaryKey({ columns: [t.variantId, t.optionValueId] })],
);

/**
 * @description `admin-catalog-crud` domain — gallery images per product OR
 * per variant (`sdd/ecommerce-product-variants/design`, D5). `productId`
 * widened from `NOT NULL` to nullable; `variantId` added, also nullable.
 * `chk_image_owner` (munod `0002:74-78`) enforces that at least one owner
 * is set — an image scoped to neither a product nor a variant is invalid.
 */
export const productImages = pgTable(
	"product_images",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		productId: uuid("product_id").references(() => products.id, {
			onDelete: "cascade",
		}),
		variantId: uuid("variant_id").references(() => productVariants.id, {
			onDelete: "cascade",
		}),
		url: text("url").notNull(),
		position: integer("position").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	(t) => [
		check(
			"chk_image_owner",
			sql`${t.productId} is not null or ${t.variantId} is not null`,
		),
	],
);

/**
 * @description `dlocal-checkout` / `admin-catalog-crud` (orders) domains.
 * Column set derived from `munod/api/src/v1/modules/Dlocal/repository.ts`'s
 * actual insert/select shape (`:174-181` for the insert payload, `:271` for
 * the select list): `order_id`, `mail`, `buyer_info`, `dlocal_id`,
 * `buyer_products`, `status`.
 *
 * `orderId` carries the UNIQUE constraint that is this template's D6
 * idempotent-webhook-processing mechanism (`api-caching-resilience.md`,
 * DB-enforced uniqueness over a bare check-then-write) — a duplicate insert
 * attempt fails with Postgres `23505`, caught and treated as a no-op replay
 * by the Phase 3 `Dlocal` service, never a second order record.
 */
export const orders = pgTable("orders", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	orderId: text("order_id").notNull().unique(),
	mail: text("mail"),
	buyerInfo: jsonb("buyer_info"),
	dlocalId: text("dlocal_id").unique(),
	buyerProducts: jsonb("buyer_products").notNull(),
	status: text("status").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
});
