import { and, count, desc, eq, ilike } from "drizzle-orm";
import { schema, withPlatformSession } from "@/lib/db";
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

const { products } = schema;

/**
 * @description `withPlatformSession`, not `withTenantSession` — same
 * reasoning as `admin/categories/repository.ts` (no `tenant_id` column,
 * design decision A4).
 */

function toProduct(row: typeof products.$inferSelect): Product {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		code: row.code,
		altCode: row.altCode,
		description: row.description,
		price: Number(row.price),
		stock: row.stock,
		stockMin: row.stockMin,
		coverImage: row.coverImage,
		categoryId: row.categoryId,
		isActive: row.isActive,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

function isUniqueViolation(e: unknown): boolean {
	return (
		typeof e === "object" &&
		e !== null &&
		"code" in e &&
		(e as { code?: unknown }).code === "23505"
	);
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
	return (
		typeof e === "object" &&
		e !== null &&
		"code" in e &&
		(e as { code?: unknown }).code === "23514"
	);
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

			return { items: rows.map(toProduct), pagination };
		});
	}

	async function getById(id: string): ReturnType<Repository["getById"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx.select().from(products).where(eq(products.id, id));

			return row ? toProduct(row) : null;
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
							code: input.code ?? null,
							altCode: input.altCode ?? null,
							description: input.description ?? null,
							price: input.price.toFixed(2),
							...(input.stock !== undefined ? { stock: input.stock } : {}),
							...(input.stockMin !== undefined
								? { stockMin: input.stockMin }
								: {}),
							coverImage: input.coverImage ?? null,
							categoryId: input.categoryId ?? null,
						})
						.returning();

					return toProduct(inserted);
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
		if (input.code !== undefined) values.code = input.code;
		if (input.altCode !== undefined) values.altCode = input.altCode;
		if (input.description !== undefined) values.description = input.description;
		if (input.price !== undefined) values.price = input.price.toFixed(2);
		if (input.stock !== undefined) values.stock = input.stock;
		if (input.stockMin !== undefined) values.stockMin = input.stockMin;
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

					return row ? toProduct(row) : null;
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
