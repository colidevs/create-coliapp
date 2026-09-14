import {
	defaultShouldDehydrateQuery,
	environmentManager,
	QueryClient,
} from "@tanstack/react-query";

/**
 * Per-request `QueryClient` factory (design decision A6,
 * `.claude/rules/frontend-technical-conventions.md`): every Server Component
 * render gets its own instance — never a shared module-scope singleton like
 * munod's own `src/lib/query.ts` (`const client = new QueryClient(); export {
 * client as queryClient };`), which is a live ADR 0021 violation already
 * recorded in `frontend-standard/munod/rollup` and deliberately NOT ported
 * verbatim here. The browser gets exactly one long-lived instance, reused
 * across renders via a module-scope variable gated on
 * `environmentManager.isServer()` — the documented `@tanstack/react-query`
 * ≥5.91.0 API, not the older `typeof window === 'undefined'` idiom.
 */
function makeQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// Pairs with a non-awaited `prefetchQuery` + `<HydrationBoundary>`
				// pattern: a short staleTime avoids an immediate client-side
				// refetch stomping the just-hydrated server data.
				staleTime: 60 * 1000,
			},
			dehydrate: {
				// Also dehydrate queries still `pending` at serialization time —
				// required for a non-awaited `prefetchQuery` pattern, where the
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
