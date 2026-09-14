"use server";

import type { PaginationQueryFn } from "@/components/data-table";
import { getOrderById, listOrders } from "@/generated/endpoints";
import type { ListOrdersParams, Order } from "./types";

/**
 * `admin/orders` is READ-ONLY end to end (`apps/api`'s own `route.ts`:
 * `GET /`, `GET /:id` only — no `POST`/`PATCH`/`DELETE` exists at all,
 * confirmed against `admin/orders/service.ts`/`repository.ts` directly).
 * Status transitions happen exclusively via the dLocal payment-notification
 * webhook (`Dlocal/repository.ts#applyPaymentTransition`), never through
 * this admin surface. There is deliberately no `updateOrderAction` or
 * `[id]/update` route for this module, unlike every other entity module —
 * see `app/(adm)/admin/orders/`'s own directory (no `update/` subfolder) and
 * `table.tsx`'s header comment for the same point.
 */
export const paginationQuery: PaginationQueryFn<
	Order,
	ListOrdersParams
> = async ({ pageIndex, pageSize }, filters) => {
	const result = await listOrders({
		page: pageIndex,
		size: pageSize,
		...filters,
	});
	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}
	return { rows: result.data.items, totalRows: result.data.pagination.total };
};

export async function getOrderByIdQuery(id: string): Promise<Order | null> {
	const result = await getOrderById(id);
	if (result.status !== 200) return null;
	return result.data;
}
