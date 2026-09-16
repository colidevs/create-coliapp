"use server";

import type { ActionFormState } from "@colidevs/utils";

import type { PaginationQueryFn } from "@/components/data-table";
import {
	getStockById,
	listStock,
	updateStockById,
} from "@/generated/endpoints";
import { toActionState } from "@/lib/problem";
import type { ListStockParams, Stock, StockUpdate } from "./types";

export type StockActionResult =
	| { success: true; data: Stock }
	| ({ success: false } & ActionFormState);

/**
 * `admin/stock` now returns a real `{ items, pagination }` page (same shape
 * as `admin/products`) — see `admin/stock/repository.ts`'s `get()` for the
 * `count()` query this is sourced from. No heuristic needed.
 */
export const paginationQuery: PaginationQueryFn<
	Stock,
	ListStockParams
> = async ({ pageIndex, pageSize }) => {
	const result = await listStock({ page: pageIndex, size: pageSize });
	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}
	return { rows: result.data.items, totalRows: result.data.pagination.total };
};

export async function listStockQuery(
	params?: ListStockParams,
): Promise<Stock[]> {
	const result = await listStock(params);
	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}
	return result.data.items;
}

export async function getStockByIdQuery(id: string): Promise<Stock | null> {
	const result = await getStockById(id);
	if (result.status !== 200) return null;
	return result.data;
}

/**
 * The only write this module's REAL `apps/api` route table permits
 * (`admin/stock/route.ts`: `GET /`, `GET /:id`, `PATCH /:id` — no create,
 * no delete). No `createStockAction`/`deleteStockAction` exist here for the
 * same reason `table.tsx` never wires `addRegister`/`onDelete` for this
 * entity.
 */
export async function updateStockAction(
	id: string,
	input: StockUpdate,
): Promise<StockActionResult> {
	const result = await updateStockById(id, input);
	if (result.status !== 200) {
		return { success: false, ...toActionState(result.data) };
	}
	return { success: true, data: result.data };
}
