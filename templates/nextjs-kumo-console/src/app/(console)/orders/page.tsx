import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
	createSearchParamsCache,
	parseAsString,
	type SearchParams,
} from "nuqs/server";
import { Suspense } from "react";
import { OrdersByTenantChart } from "@/components/orders/orders-by-tenant-chart.client";
import { OrdersList } from "@/components/orders/orders-list.client";
import { OrdersListFallback } from "@/components/orders/orders-list-fallback";
import { aip160FilterParser } from "@/lib/filter-param";
import { getQueryClient } from "@/lib/query-client";
import { listOrdersQuery } from "./queries";
import { ordersQueryKey } from "./query-keys";

/**
 * Orders list page (task 3.4, `kumo-console-template` Phase 3). Server
 * Component: creates a per-request `QueryClient` (`getQueryClient()`),
 * `prefetchQuery`s it **without** awaiting, and hands the dehydrated state
 * down through `<HydrationBoundary>` — frontend-technical-conventions.md's
 * server-state data-fetching default.
 *
 * Narrow-dynamism rule (frontend-rendering-architecture.md): `<Suspense>`
 * wraps only `<OrdersList>`, the one component that actually needs
 * per-request data — not this whole page.
 *
 * **Known, flagged gap**: `src/proxy.ts`'s optimistic Proxy matcher only
 * covers `/dashboard/:path*` today (a Phase 2 placeholder, its own comment
 * already says to update it once a real protected route lands). `proxy.ts`
 * is out of this phase's scope to touch (frozen file, per this phase's own
 * constraints) — the real authorization boundary, `verifySession()`
 * (`src/lib/dal.ts`, invoked transitively via `src/lib/api/server-client.ts`
 * on every API call this page prefetches), is unaffected by that matcher
 * gap and still enforces the actual protection. Updating the matcher is
 * left for whoever next touches `proxy.ts`.
 */
const searchParamsCache = createSearchParamsCache({
	cursor: parseAsString,
	sort: parseAsString.withDefault("-createdAt"),
	filter: aip160FilterParser,
});

interface OrdersPageProps {
	searchParams: Promise<SearchParams>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
	const { cursor, sort, filter } = await searchParamsCache.parse(searchParams);

	const queryInput = {
		cursor: cursor ?? undefined,
		sort,
		filter:
			filter.length > 0 ? aip160FilterParser.serialize(filter) : undefined,
	};

	const queryClient = getQueryClient();

	// Non-awaited on purpose (frontend-technical-conventions.md) — the promise
	// is handed to <HydrationBoundary> via dehydrate(), not resolved here.
	void queryClient.prefetchQuery({
		queryKey: ordersQueryKey(queryInput),
		queryFn: () => listOrdersQuery(queryInput),
	});

	return (
		<section className="p-6">
			<h1 className="text-kumo-default mb-4 text-2xl font-semibold">Orders</h1>
			{/* One example ECharts component (frontend-performance-tooling.md /
			console-ui-kumo.md) — static demo data, not per-request, so it needs
			no <Suspense> boundary of its own (narrow-dynamism rule). */}
			<OrdersByTenantChart />
			<HydrationBoundary state={dehydrate(queryClient)}>
				<Suspense fallback={<OrdersListFallback />}>
					<OrdersList queryInput={queryInput} />
				</Suspense>
			</HydrationBoundary>
		</section>
	);
}
