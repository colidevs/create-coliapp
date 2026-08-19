import {
	defaultShouldDehydrateQuery,
	environmentManager,
	QueryClient,
} from "@tanstack/react-query";

/**
 * Per-request `QueryClient` factory (frontend-technical-conventions.md):
 * every Server Component render gets its own instance (never a shared
 * module-scope singleton, which would leak one request's cache into
 * another's on the server). The browser gets exactly one long-lived
 * instance, reused across renders via a module-scope variable gated on
 * `environmentManager.isServer()` — the documented `@tanstack/react-query`
 * ≥5.91.0 API, not the older `typeof window === 'undefined'` idiom this rule
 * deliberately moves away from.
 */
function makeQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// Pairs with the non-awaited `prefetchQuery` + `<HydrationBoundary>`
				// pattern in orders/page.tsx: a short staleTime avoids an immediate
				// client-side refetch stomping the just-hydrated server data.
				staleTime: 60 * 1000,
			},
			dehydrate: {
				// Also dehydrate queries still `pending` at serialization time —
				// required for the non-awaited `prefetchQuery` pattern, where the
				// query may not have resolved yet when `dehydrate()` runs.
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) ||
					query.state.status === "pending",
			},
		},
	});
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
	if (environmentManager.isServer()) {
		// Server: always a fresh client, scoped to this one request/render.
		return makeQueryClient();
	}

	// Browser: reuse a single client across renders/navigations.
	if (!browserQueryClient) {
		browserQueryClient = makeQueryClient();
	}

	return browserQueryClient;
}
