import { and, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { schema, type Tx, withPlatformSession } from "@/lib/db";
import { toSlug } from "@/lib/utils";
import {
	DuplicateSlugHttpError,
	ProductRequiresActiveVariantHttpError,
} from "@/v1/res/errors";
import type { Pagination } from "@/v1/types";
import type {
	GetProductsParams,
	Product,
	ProductCreate,
	ProductUpdate,
} from "./types";

const { products, productVariants } = schema;

/**
 * @description `withPlatformSession`, not `withTenantSession` — same
 * reasoning as `admin/categories/repository.ts` (no `tenant_id` column,
 * design decision A4).
 */

interface VariantAggregate {
	variantCount: number;
	defaultPrice: number | null;
}

function toProduct(
	row: typeof products.$inferSelect,
	aggregate: VariantAggregate | undefined,
): Product {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		description: row.description,
		coverImage: row.coverImage,
		categoryId: row.categoryId,
		isActive: row.isActive,
		defaultPrice: aggregate?.defaultPrice ?? null,
		variantCount: aggregate?.variantCount ?? 0,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

/**
 * @description `variant-options` domain (design D4) — no stored rollup
 * column exists on `products`; `defaultPrice`/`variantCount` are derived at
 * read time from `product_variants`, one batched query per page (never
 * N+1), keyed by `productId`. `defaultPrice` reads the price of the variant
 * flagged `is_default` (there is at most one, design D7's partial unique
 * index); `variantCount` counts every variant regardless of `isActive`, so
 * an admin can tell a draft product with zero variants apart from one that
 * simply has none currently active.
 */
async function loadVariantAggregates(
	tx: Tx,
	productIds: string[],
): Promise<Map<string, VariantAggregate>> {
	const byProduct = new Map<string, VariantAggregate>();

	if (productIds.length === 0) {
		return byProduct;
	}

	const rows = await tx
		.select({
			productId: productVariants.productId,
			variantCount: count(productVariants.id),
			defaultPrice: sql<
				string | null
			>`max(case when ${productVariants.isDefault} then ${productVariants.price} end)`,
		})
		.from(productVariants)
		.where(inArray(productVariants.productId, productIds))
		.groupBy(productVariants.productId);

	for (const row of rows) {
		byProduct.set(row.productId, {
			variantCount: row.variantCount,
			defaultPrice: row.defaultPrice !== null ? Number(row.defaultPrice) : null,
		});
	}

	return byProduct;
}

/**
 * @description Reads the real Postgres error code off a thrown error.
 * `drizzle-orm@0.45.2` wraps every raw `pg` driver error inside its own
 * `DrizzleQueryError`, nesting the original error — the one that actually
 * carries `.code` (e.g. `23505`/`23514`) — under `.cause`, never on the
 * thrown error itself (`drizzle-orm/errors.js`, verified against the
 * installed version). Falls back to `.code` directly in case some other
 * code path throws a raw, unwrapped `pg` error.
 */
function getPgErrorCode(e: unknown): string | undefined {
	if (typeof e !== "object" || e === null) {
		return undefined;
	}
	const cause = (e as { cause?: unknown }).cause;
	if (
		typeof cause === "object" &&
		cause !== null &&
		"code" in cause &&
		typeof (cause as { code?: unknown }).code === "string"
	) {
		return (cause as { code: string }).code;
	}
	if ("code" in e && typeof (e as { code?: unknown }).code === "string") {
		return (e as { code: string }).code;
	}
	return undefined;
}

function isUniqueViolation(e: unknown): boolean {
	return getPgErrorCode(e) === "23505";
}

/**
 * @description `variant-options` domain (`sdd/ecommerce-product-variants/
 * design`). Postgres `23514` (`check_violation`) is raised by the deferrable
 * constraint trigger `trg_product_requires_active_variant`
 * (`drizzle/0005_variant_rls_and_invariants.sql`) at COMMIT, when a product
 * is set/left active with zero active variants. Same `.code` detection
 * shape as `isUniqueViolation` above.
 */
function isCheckViolation(e: unknown): boolean {
	return getPgErrorCode(e) === "23514";
}

export interface Repository {
	get: (
		params: GetProductsParams,
	) => Promise<{ items: Product[]; pagination: Pagination }>;
	getById: (id: string) => Promise<Product | null>;
	create: (input: ProductCreate) => Promise<Product>;
	update: (id: string, input: ProductUpdate) => Promise<Product | null>;
	delete: (id: string) => Promise<boolean>;
}

function productRepo(): Repository {
	async function get(params: GetProductsParams): ReturnType<Repository["get"]> {
		const size = params.size ?? 10;
		const page = params.page ?? 0;
		const offset = page * size;

		const filters = [
			params.categoryId ? eq(products.categoryId, params.categoryId) : null,
			params.q ? ilike(products.name, `%${params.q}%`) : null,
		].filter((clause) => clause !== null);
		const where = filters.length > 0 ? and(...filters) : undefined;

		return withPlatformSession(async (tx) => {
			const rows = await tx
				.select()
				.from(products)
				.where(where)
				.orderBy(desc(products.createdAt))
				.limit(size)
				.offset(offset);

			const [{ value: total }] = await tx
				.select({ value: count() })
				.from(products)
				.where(where);

			const totalPages = Math.ceil(total / size);
			const pagination: Pagination = {
				page,
				size,
				count: rows.length,
				total,
				next: totalPages > 0 ? Math.max(totalPages - (page + 1), 0) : 0,
				previous: page > 0 ? page - 1 : 0,
			};

			const aggregates = await loadVariantAggregates(
				tx,
				rows.map((row) => row.id),
			);

			return {
				items: rows.map((row) => toProduct(row, aggregates.get(row.id))),
				pagination,
			};
		});
	}

	async function getById(id: string): ReturnType<Repository["getById"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx.select().from(products).where(eq(products.id, id));

			if (!row) {
				return null;
			}

			const aggregates = await loadVariantAggregates(tx, [row.id]);

			return toProduct(row, aggregates.get(row.id));
		});
	}

	/**
	 * @description The `try`/`catch` here wraps the ENTIRE
	 * `withPlatformSession` call, not just the `tx.insert()` inside it —
	 * `trg_product_requires_active_variant`/
	 * `trg_variant_keeps_product_publishable`
	 * (`drizzle/0005_variant_rls_and_invariants.sql`) are `DEFERRABLE
	 * INITIALLY DEFERRED`, so a `23514` from either raises at COMMIT time,
	 * i.e. from `withPlatformSession`'s own returned promise — AFTER the
	 * transaction callback below has already returned normally. A `catch`
	 * placed only inside that callback would never observe it.
	 */
	async function create(
		input: ProductCreate,
	): ReturnType<Repository["create"]> {
		const slug = toSlug(input.name);

		try {
			return await withPlatformSession(async (tx) => {
				try {
					const [inserted] = await tx
						.insert(products)
						.values({
							name: input.name,
							slug,
							description: input.description ?? null,
							coverImage: input.coverImage ?? null,
							categoryId: input.categoryId ?? null,
						})
						.returning();

					// A freshly created product has zero variants (design D3) —
					// no aggregate lookup needed.
					return toProduct(inserted, undefined);
				} catch (e) {
					if (isUniqueViolation(e)) {
						throw new DuplicateSlugHttpError(slug);
					}
					throw e;
				}
			});
		} catch (e) {
			if (isCheckViolation(e)) {
				throw new ProductRequiresActiveVariantHttpError();
			}
			throw e;
		}
	}

	async function update(
		id: string,
		input: ProductUpdate,
	): ReturnType<Repository["update"]> {
		const values: Partial<typeof products.$inferInsert> = {
			updatedAt: new Date(),
		};
		let slug: string | undefined;

		if (input.name !== undefined) {
			slug = toSlug(input.name);
			values.name = input.name;
			values.slug = slug;
		}
		if (input.description !== undefined) values.description = input.description;
		if (input.coverImage !== undefined) values.coverImage = input.coverImage;
		if (input.categoryId !== undefined) values.categoryId = input.categoryId;
		if (input.isActive !== undefined) values.isActive = input.isActive;

		/**
		 * @description See `create()`'s own comment above — the outer
		 * `try`/`catch` is required (not the inner one alone) to observe a
		 * deferred `23514` raised at COMMIT time, which is exactly the case
		 * this function exercises when `input.isActive` is set to `true`
		 * with zero active variants.
		 */
		try {
			return await withPlatformSession(async (tx) => {
				try {
					const [row] = await tx
						.update(products)
						.set(values)
						.where(eq(products.id, id))
						.returning();

					if (!row) {
						return null;
					}

					const aggregates = await loadVariantAggregates(tx, [row.id]);

					return toProduct(row, aggregates.get(row.id));
				} catch (e) {
					if (isUniqueViolation(e) && slug) {
						throw new DuplicateSlugHttpError(slug);
					}
					throw e;
				}
			});
		} catch (e) {
			if (isCheckViolation(e)) {
				throw new ProductRequiresActiveVariantHttpError();
			}
			throw e;
		}
	}

	/**
	 * @description Soft delete (`isActive: false`), matching munod's real
	 * `admin/products` convention — `product_images.product_id` cascades on
	 * delete, but a product itself is never hard-deleted (an order's
	 * `buyer_products` jsonb snapshot, `Dlocal/repository.ts`, references a
	 * `productId` that must stay resolvable for historical order display).
	 */
	async function deleteOne(id: string): ReturnType<Repository["delete"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.update(products)
				.set({ isActive: false, updatedAt: new Date() })
				.where(eq(products.id, id))
				.returning({ id: products.id });

			return Boolean(row);
		});
	}

	return { get, getById, create, update, delete: deleteOne };
}

export { productRepo as createProductRepository };
