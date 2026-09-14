import { count, desc, eq } from "drizzle-orm";
import { schema, withPlatformSession } from "@/lib/db";
import type { Pagination } from "@/v1/types";
import type {
	GetOrdersParams,
	Order,
	OrderBuyerInfo,
	OrderItem,
} from "./types";

const { orders } = schema;

/**
 * @description `withPlatformSession`, not `withTenantSession` — same
 * reasoning as every other Phase 3b repository (no `tenant_id` column on
 * this table, design decision A4/A1). Read-only: no `create`/`update`/
 * `delete` method exists on this `Repository` at all — orders are written
 * exclusively by the `Dlocal` module's own repository (Phase 3a).
 */

function toOrder(row: typeof orders.$inferSelect): Order {
	return {
		id: row.id,
		orderId: row.orderId,
		mail: row.mail,
		buyerInfo: row.buyerInfo as OrderBuyerInfo | null,
		dlocalId: row.dlocalId,
		buyerProducts: row.buyerProducts as OrderItem[],
		status: row.status,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export interface Repository {
	get: (
		params: GetOrdersParams,
	) => Promise<{ items: Order[]; pagination: Pagination }>;
	getById: (id: string) => Promise<Order | null>;
}

function orderRepo(): Repository {
	async function get(params: GetOrdersParams): ReturnType<Repository["get"]> {
		const size = params.size ?? 10;
		const page = params.page ?? 0;
		const offset = page * size;
		const where = params.status ? eq(orders.status, params.status) : undefined;

		return withPlatformSession(async (tx) => {
			const rows = await tx
				.select()
				.from(orders)
				.where(where)
				.orderBy(desc(orders.createdAt))
				.limit(size)
				.offset(offset);

			const [{ value: total }] = await tx
				.select({ value: count() })
				.from(orders)
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

			return { items: rows.map(toOrder), pagination };
		});
	}

	async function getById(id: string): ReturnType<Repository["getById"]> {
		return withPlatformSession(async (tx) => {
			const [row] = await tx.select().from(orders).where(eq(orders.id, id));

			return row ? toOrder(row) : null;
		});
	}

	return { get, getById };
}

export { orderRepo as createOrderRepository };
