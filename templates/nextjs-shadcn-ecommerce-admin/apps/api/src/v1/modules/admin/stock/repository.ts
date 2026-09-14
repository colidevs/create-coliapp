import { asc, eq, inArray } from "drizzle-orm";
import { schema, type Tx, withPlatformSession } from "@/lib/db";
import type { GetStockParams, StockItem, StockUpdate } from "./types";

const {
	products,
	productVariants,
	variantOptionSelections,
	variantOptionValues,
	variantOptionTypes,
} = schema;

const STOCK_COLUMNS = {
	id: productVariants.id,
	productId: productVariants.productId,
	name: products.name,
	slug: products.slug,
	stock: productVariants.stock,
	stockMin: productVariants.stockMin,
	code: productVariants.code,
	altCode: productVariants.altCode,
	coverImage: products.coverImage,
};

type StockRow = Omit<StockItem, "variantLabel">;

/**
 * @description Builds each variant's `variantLabel` — its selected
 * option-values, human-readable, joined `" / "` — ordered by
 * `variant_option_types.display_order` then `variant_option_values.
 * display_order` (the design's own proposed join-order convention, carried
 * unchanged into `Dlocal`'s `PricedOrderItem.variantLabel` in Phase 6).
 * Returns `undefined` for a variant with zero option-value selections
 * (e.g. a single-variant product with no option types) — never an empty
 * string.
 */
async function loadVariantLabels(
	tx: Tx,
	variantIds: string[],
): Promise<Map<string, string>> {
	const byVariant = new Map<string, string>();

	if (variantIds.length === 0) {
		return byVariant;
	}

	const rows = await tx
		.select({
			variantId: variantOptionSelections.variantId,
			value: variantOptionValues.value,
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

	const valuesByVariant = new Map<string, string[]>();
	for (const row of rows) {
		const existing = valuesByVariant.get(row.variantId);
		if (existing) {
			existing.push(row.value);
		} else {
			valuesByVariant.set(row.variantId, [row.value]);
		}
	}

	for (const [variantId, values] of valuesByVariant) {
		byVariant.set(variantId, values.join(" / "));
	}

	return byVariant;
}

async function attachLabels(tx: Tx, rows: StockRow[]): Promise<StockItem[]> {
	const labels = await loadVariantLabels(
		tx,
		rows.map((row) => row.id),
	);

	return rows.map((row) => ({
		...row,
		variantLabel: labels.get(row.id) ?? null,
	}));
}

export interface Repository {
	get: (params: GetStockParams) => Promise<StockItem[]>;
	getById: (id: string) => Promise<StockItem | null>;
	update: (id: string, input: StockUpdate) => Promise<StockItem | null>;
}

function stockRepo(): Repository {
	async function get(params: GetStockParams): ReturnType<Repository["get"]> {
		const size = params.size ?? 10;
		const page = params.page ?? 0;
		const offset = page * size;

		return withPlatformSession(async (tx) => {
			const rows = await tx
				.select(STOCK_COLUMNS)
				.from(productVariants)
				.innerJoin(products, eq(productVariants.productId, products.id))
				.orderBy(asc(products.name), asc(productVariants.displayOrder))
				.limit(size)
				.offset(offset);

			return attachLabels(tx, rows);
		});
	}

	async function getById(id: string): ReturnType<Repository["getById"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.select(STOCK_COLUMNS)
				.from(productVariants)
				.innerJoin(products, eq(productVariants.productId, products.id))
				.where(eq(productVariants.id, id));

			if (!row) {
				return null;
			}

			const [withLabel] = await attachLabels(tx, [row]);

			return withLabel;
		});
	}

	/**
	 * @description Not the same code path as the `Dlocal` module's
	 * `decrementStock` (Phase 3a) — that one is an atomic, order-driven
	 * DECREMENT guarded against concurrent webhook delivery. This is an
	 * admin-authored, absolute SET of both columns (matching munod's own
	 * `stock/repository.ts#updateById`) — a human deliberately correcting a
	 * count, not two concurrent writers racing for the same units. Now keyed
	 * by `variant_id`, per `sdd/ecommerce-product-variants/spec`'s "Atomic
	 * decrement"/"Atomic restore" requirements.
	 */
	async function update(
		id: string,
		input: StockUpdate,
	): ReturnType<Repository["update"]> {
		return withPlatformSession(async (tx) => {
			const [updated] = await tx
				.update(productVariants)
				.set({
					stock: input.stock,
					stockMin: input.stockMin,
					updatedAt: new Date(),
				})
				.where(eq(productVariants.id, id))
				.returning({ id: productVariants.id });

			if (!updated) {
				return null;
			}

			const [row] = await tx
				.select(STOCK_COLUMNS)
				.from(productVariants)
				.innerJoin(products, eq(productVariants.productId, products.id))
				.where(eq(productVariants.id, id));

			if (!row) {
				return null;
			}

			const [withLabel] = await attachLabels(tx, [row]);

			return withLabel;
		});
	}

	return { get, getById, update };
}

export { stockRepo as createStockRepository };
