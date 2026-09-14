import { and, count, desc, eq, ilike } from "drizzle-orm";
import { schema, withPlatformSession } from "@/lib/db";
import type { Product } from "@/v1/modules/admin/products/types";
import type { Pagination } from "@/v1/types";
import type { GetPublicProductsParams } from "./types";

const { products } = schema;

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

export interface Repository {
	getActive: (
		params: GetPublicProductsParams,
	) => Promise<{ items: Product[]; pagination: Pagination }>;
	getActiveBySlug: (slug: string) => Promise<Product | null>;
}

/**
 * @description Public, unauthenticated storefront reads — always filters
 * `is_active = true` (never surfaces a deactivated/soft-deleted product),
 * matching munod's own `web/products` convention.
 */
function webProductRepo(): Repository {
	async function getActive(
		params: GetPublicProductsParams,
	): ReturnType<Repository["getActive"]> {
		const size = params.size ?? 10;
		const page = params.page ?? 0;
		const offset = page * size;

		const filters = [
			eq(products.isActive, true),
			params.categoryId ? eq(products.categoryId, params.categoryId) : null,
			params.q ? ilike(products.name, `%${params.q}%`) : null,
		].filter((clause) => clause !== null);
		const where = and(...filters);

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

	async function getActiveBySlug(
		slug: string,
	): ReturnType<Repository["getActiveBySlug"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.select()
				.from(products)
				.where(and(eq(products.slug, slug), eq(products.isActive, true)));

			return row ? toProduct(row) : null;
		});
	}

	return { getActive, getActiveBySlug };
}

export { webProductRepo as createWebProductRepository };
