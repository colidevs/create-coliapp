"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ListPublicProductsParams } from "@/generated/model";
import { publicProductsQueryOptions } from "@/modules/products/queries";
import { ProductsGrid } from "./products-grid";

/**
 * Client half of the ADR 0021 per-request-prefetch pattern — consumes the
 * cache `app/(ecommerce)/{page,products/page}.tsx` (the Server Component
 * halves) hydrate via `<HydrationBoundary>`. New for this template (munod's
 * own `products/page.tsx` renders `ProductsGrid` directly from the Server
 * Component with no client-side query layer at all — this template's own
 * design decision A6 requires the TanStack Query round-trip instead).
 *
 * `basePath` (a plain string) rather than a `buildHref` function prop — a
 * function cannot cross the Server→Client Component boundary (React/Next
 * rejects it at render time: "Functions cannot be passed directly to Client
 * Components unless ... marked with 'use server'"), a real bug found live
 * against a running dev server. Pagination hrefs are built here, entirely
 * from serializable data (`basePath`, the query's own `params`, and the
 * resolved `pagination.page`).
 */
export function ProductsListClient({
	params,
	basePath,
}: {
	params?: ListPublicProductsParams;
	basePath: string;
}) {
	const { data, isLoading } = useQuery(publicProductsQueryOptions(params));

	if (isLoading || !data) {
		return (
			<div className="py-24 text-center text-muted-foreground text-sm">
				Loading products…
			</div>
		);
	}

	const { items, pagination } = data;
	const hasPrevious = pagination.page > 1;
	const hasNext = pagination.page * pagination.size < pagination.total;

	function hrefForPage(page: number): string {
		const search = new URLSearchParams();
		search.set("page", String(page));
		if (params?.categoryId) search.set("categoryId", params.categoryId);
		if (params?.q) search.set("q", params.q);
		return `${basePath}?${search.toString()}`;
	}

	return (
		<div>
			<ProductsGrid products={items} />
			{pagination.total > pagination.size ? (
				<div className="flex items-center justify-center gap-4 pb-12">
					{hasPrevious ? (
						<Button asChild variant="outline">
							<Link href={hrefForPage(pagination.page - 1)}>Previous</Link>
						</Button>
					) : (
						<Button variant="outline" disabled>
							Previous
						</Button>
					)}
					<span className="text-muted-foreground text-sm">
						Page {pagination.page}
					</span>
					{hasNext ? (
						<Button asChild variant="outline">
							<Link href={hrefForPage(pagination.page + 1)}>Next</Link>
						</Button>
					) : (
						<Button variant="outline" disabled>
							Next
						</Button>
					)}
				</div>
			) : null}
		</div>
	);
}
