"use server";

import { listOrders } from "@/generated/orders/endpoints/orders/orders";
import type { OrderList, Problem } from "@/generated/orders/model";
import type { OrdersQueryInput } from "./query-keys";

/**
 * The `queryFn` both `page.tsx`'s non-awaited `prefetchQuery` and
 * `src/components/orders/orders-list.client.tsx`'s `useSuspenseQuery` call —
 * a Server Action rather than a direct fetch, because every colidevs API
 * call in this template goes through `src/lib/api/server-client.ts`'s
 * `server-only` mutator (session/tenant forwarding). A Server Action is what
 * lets the *client* component still trigger this same call (e.g. TanStack
 * Query's own window-refocus refetch) without ever calling the API
 * directly from the browser — Next.js turns a `"use server"` export into a
 * callable RPC from client code, no separate Route Handler needed.
 *
 * Throws (rather than returning a `problemToActionState`-shaped result) on
 * a non-200 response — this is a read, not a form submission, so TanStack
 * Query's own error handling is the right consumer, not `useActionState`.
 */
export async function listOrdersQuery(
	input: OrdersQueryInput = {},
): Promise<OrderList> {
	const result = await listOrders({
		cursor: input.cursor,
		sort: input.sort,
		filter: input.filter,
	});

	if (result.status !== 200) {
		const problem = result.data as Problem;
		throw new Error(
			problem.detail ?? problem.title ?? "Failed to load orders.",
		);
	}

	return result.data;
}
