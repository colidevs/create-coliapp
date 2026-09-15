import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getQueryClient } from "@/lib/query";
import { ProductsListClient } from "@/modules/products/ecommerce/products-list-client";
import { publicProductsQueryOptions } from "@/modules/products/queries";

const HOME_PARAMS = { page: 1, size: 8 };

/**
 * Adapted, not a byte-for-byte port, of munod's real
 * `app/(ecommerce)/page.tsx`. Munod's home page renders a curated, shuffled
 * pool of products from its own `home-products` module — a separate
 * munod-specific admin-curated feature this template's actual API has no
 * counterpart for (`apps/api` only ships `admin`/`web` modules for
 * `products`/`categories`/`product-images`/`stock`/`orders`, per this
 * template's own design's Architecture Decision A5 — there is no
 * `home-products` module to port an equivalent admin surface for). This
 * home page instead shows a simple hero plus the first page of the real
 * public catalog, reusing the same `getQueryClient()`/`prefetchQuery`+
 * `HydrationBoundary` pattern as `products/page.tsx`.
 *
 * `await`ed, not fire-and-forget (deviates from ADR 0021's documented
 * default of a non-awaited `prefetchQuery`): that default assumes the
 * consuming Client Component reads the still-pending dehydrated query via
 * `useSuspenseQuery` inside a `<Suspense>` boundary, letting React's own
 * streaming SSR patch in the resolved HTML once the promise settles.
 * `ProductsListClient` uses plain `useQuery`/`isLoading` with no `<Suspense>`
 * boundary — a real, confirmed live bug (`pnpm build && pnpm start`, MSW
 * backend): the non-awaited prefetch dehydrated a still-`pending` query with
 * no data, so the server rendered nothing but "Loading products…" (verified
 * via a raw `curl` of the SSR HTML — zero product links present), and the
 * browser then threw a genuine React hydration-mismatch error (minified
 * error #418) instead of ever resolving cleanly. Awaiting here makes the
 * dehydrated state carry the already-resolved data, so the server-rendered
 * HTML and the client's first hydration pass agree from the start.
 */
export default async function HomePage() {
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery(publicProductsQueryOptions(HOME_PARAMS));

	return (
		<div className="mx-auto max-w-6xl px-4">
			<section className="flex flex-col items-center gap-4 py-16 text-center">
				<h1 className="font-semibold text-3xl">{siteConfig.name}</h1>
				<p className="max-w-md text-muted-foreground">
					{siteConfig.description}
				</p>
				<Button asChild>
					<Link href="/products">Browse all products</Link>
				</Button>
			</section>
			<HydrationBoundary state={dehydrate(queryClient)}>
				<ProductsListClient params={HOME_PARAMS} basePath="/products" />
			</HydrationBoundary>
		</div>
	);
}
