import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { ListPublicProductsParams } from "@/generated/model";
import { getQueryClient } from "@/lib/query";
import { ProductsListClient } from "@/modules/products/ecommerce/products-list-client";
import { publicProductsQueryOptions } from "@/modules/products/queries";

function toNumber(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Ported (structurally) from munod's real `app/(ecommerce)/products/
 * page.tsx` — same shape (a page-level catalog listing reading
 * `searchParams`), rebuilt against this template's ACTUAL public list
 * contract (`page`/`size`/`categoryId`/`q`, `ListPublicProductsParams`) and
 * the ADR 0021 `getQueryClient()`/`prefetchQuery`+`HydrationBoundary`
 * pattern task 6.2 requires — munod's own version calls a Server Action
 * directly with no client-side query layer at all.
 */
export default async function ProductsPage({
	searchParams,
}: {
	searchParams: Promise<{
		page?: string;
		categoryId?: string;
		q?: string;
	}>;
}) {
	const { page, categoryId, q } = await searchParams;

	// `exactOptionalPropertyTypes` (ADR 0030) rejects an explicit `undefined`
	// value for an optional key — conditionally spread instead of assigning
	// `key: value || undefined`.
	const params: ListPublicProductsParams = {
		page: toNumber(page, 1),
		...(categoryId ? { categoryId } : {}),
		...(q ? { q } : {}),
	};

	const queryClient = getQueryClient();
	// Awaited — see `app/(ecommerce)/page.tsx`'s doc comment for the full
	// root-cause explanation (confirmed live hydration-mismatch fix, not a
	// speculative change): a non-awaited `prefetchQuery` here dehydrates a
	// still-`pending` query with no data, which this page's `ProductsListClient`
	// (plain `useQuery`, no `<Suspense>` boundary) cannot resolve without a
	// real React hydration error.
	await queryClient.prefetchQuery(publicProductsQueryOptions(params));

	return (
		<div className="mx-auto max-w-6xl px-4">
			<h1 className="pt-8 font-semibold text-2xl">Products</h1>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<ProductsListClient params={params} basePath="/products" />
			</HydrationBoundary>
		</div>
	);
}
