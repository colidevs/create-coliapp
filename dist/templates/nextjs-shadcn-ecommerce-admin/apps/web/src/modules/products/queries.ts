import { queryOptions } from "@tanstack/react-query";

import type { ListPublicProductsParams } from "@/generated/model";
import {
	getPublicProductBySlugQuery,
	listPublicProductsQuery,
} from "./actions";

/**
 * Shared `queryOptions()` — the ADR 0021 pattern (`.claude/rules/
 * frontend-technical-conventions.md`): a Server Component prefetches with
 * the SAME query key/fn via `getQueryClient()` + `prefetchQuery` (not
 * awaited) + `<HydrationBoundary>`, and the Client Component consuming the
 * hydrated cache calls `useQuery` with this identical options object — no
 * key drift between the two sides. `queryFn` calls `./actions.ts`'s
 * `"use server"` wrappers, never the generated client directly (see that
 * file's own doc comment for why).
 */
export function publicProductsQueryOptions(params?: ListPublicProductsParams) {
	return queryOptions({
		queryKey: ["public-products", params ?? {}] as const,
		queryFn: () => listPublicProductsQuery(params),
	});
}

export function publicProductBySlugQueryOptions(slug: string) {
	return queryOptions({
		queryKey: ["public-product", slug] as const,
		queryFn: () => getPublicProductBySlugQuery(slug),
	});
}
