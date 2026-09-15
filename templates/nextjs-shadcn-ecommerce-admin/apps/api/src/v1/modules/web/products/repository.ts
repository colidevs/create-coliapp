import { and, asc, count, desc, eq, ilike, inArray } from "drizzle-orm";
import { schema, type Tx, withPlatformSession } from "@/lib/db";
import type { Pagination } from "@/v1/types";
import type {
	GetPublicProductsParams,
	PublicProduct,
	PublicVariant,
	PublicVariantOption,
} from "./types";

const {
	products,
	productVariants,
	variantOptionSelections,
	variantOptionValues,
	variantOptionTypes,
} = schema;

function toProduct(
	row: typeof products.$inferSelect,
	variants: PublicVariant[],
): PublicProduct {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		description: row.description,
		coverImage: row.coverImage,
		categoryId: row.categoryId,
		variants,
	};
}

/**
 * @description Loads every ACTIVE variant for the given products, each with
 * its resolved option-value selections, in a fixed, bounded number of
 * queries (never N+1 per product). Options are ordered by
 * `variant_option_types.display_order` then `variant_option_values.
 * display_order` — same join-order convention `admin/stock/repository.ts`
 * uses for `variantLabel`.
 */
async function loadActiveVariantsByProductId(
	tx: Tx,
	productIds: string[],
): Promise<Map<string, PublicVariant[]>> {
	const byProduct = new Map<string, PublicVariant[]>();

	if (productIds.length === 0) {
		return byProduct;
	}

	const variantRows = await tx
		.select()
		.from(productVariants)
		.where(
			and(
				inArray(productVariants.productId, productIds),
				eq(productVariants.isActive, true),
			),
		)
		.orderBy(asc(productVariants.displayOrder), asc(productVariants.createdAt));

	const variantIds = variantRows.map((row) => row.id);

	const optionsByVariant = new Map<string, PublicVariantOption[]>();
	if (variantIds.length > 0) {
		const optionRows = await tx
			.select({
				variantId: variantOptionSelections.variantId,
				optionTypeSlug: variantOptionTypes.slug,
				optionTypeName: variantOptionTypes.name,
				valueSlug: variantOptionValues.slug,
				value: variantOptionValues.value,
				imageUrl: variantOptionValues.imageUrl,
				description: variantOptionValues.description,
			})
			.from(variantOptionSelections)
			.innerJoin(
				variantOptionValues,
				eq(variantOptionSelections.optionValueId, variantOptionValues.id),
			)
			.innerJoin(
				variantOptionTypes,
				eq(variantOptionValues.optionTypeId, variantOptionTypes.id),
			)
			.where(inArray(variantOptionSelections.variantId, variantIds))
			.orderBy(
				asc(variantOptionTypes.displayOrder),
				asc(variantOptionValues.displayOrder),
			);

		for (const row of optionRows) {
			const option: PublicVariantOption = {
				optionTypeSlug: row.optionTypeSlug,
				optionTypeName: row.optionTypeName,
				valueSlug: row.valueSlug,
				value: row.value,
				imageUrl: row.imageUrl,
				description: row.description,
			};
			const existing = optionsByVariant.get(row.variantId);
			if (existing) {
				existing.push(option);
			} else {
				optionsByVariant.set(row.variantId, [option]);
			}
		}
	}

	for (const row of variantRows) {
		const variant: PublicVariant = {
			id: row.id,
			price: Number(row.price),
			stock: row.stock,
			isDefault: row.isDefault,
			options: optionsByVariant.get(row.id) ?? [],
		};
		const existing = byProduct.get(row.productId);
		if (existing) {
			existing.push(variant);
		} else {
			byProduct.set(row.productId, [variant]);
		}
	}

	return byProduct;
}

export interface Repository {
	getActive: (
		params: GetPublicProductsParams,
	) => Promise<{ items: PublicProduct[]; pagination: Pagination }>;
	getActiveBySlug: (slug: string) => Promise<PublicProduct | null>;
}

/**
 * @description Public, unauthenticated storefront reads — always filters
 * `is_active = true` (never surfaces a soft-deleted product) AND
 * `is_published = true` (never surfaces a still-drafting product), matching
 * munod's own `web/products` convention (apply PR22 fix: these used to be
 * one conflated `is_active` boolean; a still-drafting product is now a
 * genuinely distinct state from a soft-deleted one, and both must stay
 * excluded from the storefront). Only ACTIVE variants are nested
 * (`loadActiveVariantsByProductId`) — a published product is guaranteed at
 * least one by the deferrable constraint trigger
 * (`drizzle/0007_products_require_published_variant.sql`).
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
			eq(products.isPublished, true),
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

			const variantsByProduct = await loadActiveVariantsByProductId(
				tx,
				rows.map((row) => row.id),
			);

			return {
				items: rows.map((row) =>
					toProduct(row, variantsByProduct.get(row.id) ?? []),
				),
				pagination,
			};
		});
	}

	async function getActiveBySlug(
		slug: string,
	): ReturnType<Repository["getActiveBySlug"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.select()
				.from(products)
				.where(
					and(
						eq(products.slug, slug),
						eq(products.isActive, true),
						eq(products.isPublished, true),
					),
				);

			if (!row) {
				return null;
			}

			const variantsByProduct = await loadActiveVariantsByProductId(tx, [
				row.id,
			]);

			return toProduct(row, variantsByProduct.get(row.id) ?? []);
		});
	}

	return { getActive, getActiveBySlug };
}

export { webProductRepo as createWebProductRepository };
