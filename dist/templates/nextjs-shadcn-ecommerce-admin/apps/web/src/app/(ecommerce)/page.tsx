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
 */
export default function HomePage() {
	const queryClient = getQueryClient();
	void queryClient.prefetchQuery(publicProductsQueryOptions(HOME_PARAMS));

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
