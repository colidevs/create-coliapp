/**
 * Plain (no `"use server"`/`"use client"`) module shared by the RSC page
 * (`page.tsx`, prefetching) and the client list component
 * (`src/components/orders/orders-list.client.tsx`, `useSuspenseQuery`) —
 * frontend-technical-conventions.md's "Same query key on both sides"
 * requirement, the "Hydration match" spec scenario depends on this being
 * one shared source, not two independently-typed copies.
 *
 * Deliberately NOT colocated in `queries.ts`: that file is `"use server"`,
 * and every top-level export of a `"use server"` module must itself be an
 * async Server Action — a plain synchronous helper like this one cannot
 * live there.
 */

export interface OrdersQueryInput {
	cursor?: string;
	sort?: string;
	filter?: string;
}

export function ordersQueryKey(input: OrdersQueryInput) {
	return ["orders", "list", input] as const;
}
