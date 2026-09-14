import { sql } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
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
 * @description `admin-catalog-crud` / `stock-management` domains. `stock`/
 * `stockMin` are columns here, not a separate table (design decision A4) —
 * munod's `StockSchema` (`stock/repository.ts:33-37`) selects them directly
 * off `products`; stock is a projection over this table, not its own
 * resource.
 */
export const products = pgTable("products", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	code: text("code"),
	altCode: text("alt_code"),
	description: text("description"),
	price: numeric("price", { precision: 12, scale: 2 }).notNull(),
	/**
	 * @description Negative stock is this template's "untracked inventory"
	 * convention, ported from munod's own repository logic
	 * (`Dlocal/repository.ts:366`) — a negative value intentionally opts a
	 * product out of the atomic-decrement guard in Phase 3's stock service,
	 * never a data-integrity error to reject.
	 */
	stock: integer("stock").notNull().default(0),
	stockMin: integer("stock_min").notNull().default(0),
	coverImage: text("cover_image"),
	categoryId: uuid("category_id").references(() => categories.id),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
});

/** @description `admin-catalog-crud` domain — gallery images per product. */
export const productImages = pgTable("product_images", {
	id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
	productId: uuid("product_id")
		.notNull()
		.references(() => products.id, { onDelete: "cascade" }),
	url: text("url").notNull(),
	position: integer("position").notNull().default(0),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.default(sql`now()`),
});

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
