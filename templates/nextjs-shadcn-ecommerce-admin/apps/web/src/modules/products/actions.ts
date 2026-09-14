"use server";

import {
	getPublicProductBySlug,
	listPublicProducts,
} from "@/generated/endpoints";
import type { ListPublicProductsParams, ProductList } from "@/generated/model";

/**
 * Server Actions wrapping the generated public-product endpoints — required
 * (not merely convenient) because `@/generated/endpoints` transitively
 * imports `@/lib/api`'s `server-only`-guarded `apiRequest` mutator (Phase 5,
 * `x-service-key` header). `./queries.ts`'s `queryOptions()` is imported by
 * BOTH a Server Component (`products/page.tsx`'s `prefetchQuery`) and a
 * Client Component (`products-list-client.tsx`'s `useQuery`) — the client
 * side can never statically import the generated client directly (Next
 * fails the build: "You're importing a component that needs 'server-only'").
 * A `"use server"` export is what lets client code still reference the same
 * `queryFn` (e.g. TanStack Query's own window-refocus refetch) as an RPC
 * call, mirroring `nextjs-kumo-console/src/app/(console)/orders/queries.ts`'s
 * own established pattern exactly.
 */
export async function listPublicProductsQuery(
	params?: ListPublicProductsParams,
): Promise<ProductList> {
	const result = await listPublicProducts(params);

	if (result.status !== 200) {
		throw new Error(result.data.detail ?? result.data.title);
	}

	return result.data;
}

export async function getPublicProductBySlugQuery(slug: string) {
	const result = await getPublicProductBySlug(slug);

	if (result.status !== 200) {
		return null;
	}

	return result.data;
}
