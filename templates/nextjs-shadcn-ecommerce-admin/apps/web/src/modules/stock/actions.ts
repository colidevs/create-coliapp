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
 * `admin/stock` returns a flat `StockItem[]` (no `pagination` wrapper —
 * confirmed against `admin/stock/repository.ts`'s own `get()`: server-side
 * `page`/`size` offset, but the response carries no `total` count at all,
 * unlike `admin/products`/`admin/orders`). `DataTable`'s own contract
 * (`manualPagination: true`) still expects a `{ rows, totalRows }` page —
 * with no real total to report, this uses the standard "full page ⇒ assume
 * at least one more" heuristic rather than fabricating an exact count.
 * **Named limitation**: the last page's displayed "total" is only exact once
 * a short page is returned; every fuller page shows one extra phantom row
 * of "total" until then. Same class of documented pagination-fidelity
 * limitation as `modules/categories/actions.ts`'s own client-side slice.
 */
export const paginationQuery: PaginationQueryFn<
	Stock,
	ListStockParams
> = async ({ pageIndex, pageSize }) => {
	const rows = await listStockQuery({ page: pageIndex, size: pageSize });
	const hasMore = rows.length === pageSize;
	return {
		rows,
		totalRows: hasMore
			? (pageIndex + 1) * pageSize + 1
			: pageIndex * pageSize + rows.length,
	};
};

export async function listStockQuery(
	params?: ListStockParams,
): Promise<Stock[]> {
	const result = await listStock(params);
	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}
	return result.data;
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
