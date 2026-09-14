import { asc, eq } from "drizzle-orm";
import { schema, withPlatformSession } from "@/lib/db";
import type { GetStockParams, StockItem, StockUpdate } from "./types";

const { products } = schema;

const STOCK_COLUMNS = {
	id: products.id,
	name: products.name,
	slug: products.slug,
	stock: products.stock,
	stockMin: products.stockMin,
	code: products.code,
	altCode: products.altCode,
	coverImage: products.coverImage,
};

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
				.from(products)
				.orderBy(asc(products.name))
				.limit(size)
				.offset(offset);

			return rows;
		});
	}

	async function getById(id: string): ReturnType<Repository["getById"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.select(STOCK_COLUMNS)
				.from(products)
				.where(eq(products.id, id));

			return row ?? null;
		});
	}

	/**
	 * @description Not the same code path as the `Dlocal` module's
	 * `decrementStock` (Phase 3a) — that one is an atomic, order-driven
	 * DECREMENT guarded against concurrent webhook delivery. This is an
	 * admin-authored, absolute SET of both columns (matching munod's own
	 * `stock/repository.ts#updateById`) — a human deliberately correcting a
	 * count, not two concurrent writers racing for the same units.
	 */
	async function update(
		id: string,
		input: StockUpdate,
	): ReturnType<Repository["update"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx
				.update(products)
				.set({
					stock: input.stock,
					stockMin: input.stockMin,
					updatedAt: new Date(),
				})
				.where(eq(products.id, id))
				.returning(STOCK_COLUMNS);

			return row ?? null;
		});
	}

	return { get, getById, update };
}

export { stockRepo as createStockRepository };
