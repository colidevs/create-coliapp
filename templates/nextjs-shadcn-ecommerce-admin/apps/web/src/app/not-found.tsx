import Link from "next/link";

import { QueryProvider } from "@/components/providers/query-provider";
import { Button } from "@/components/ui/button";
import { listPublicCategories } from "@/generated/endpoints";
import type { Category } from "@/generated/model";
import { EcommerceShell } from "./(ecommerce)/shell";

/**
 * Global `not-found` boundary — added live-audit fix (P1 finding #12,
 * `sdd/ecommerce-product-variants` post-pilot Playwright UX audit).
 * `app/(ecommerce)/not-found.tsx` already handles the in-storefront case
 * (a product `notFound()` call), automatically inheriting the header/footer
 * from `EcommerceRootLayout`. This file is the separate catch-all Next.js
 * renders for a URL that matches NO route at all — a case that, by Next's
 * own App Router routing rules, does NOT nest under any route group's
 * layout, so it needs to reuse the storefront shell explicitly to keep the
 * same header/nav the rest of the site shows on every other page (rather
 * than falling back to Next's own stock, chrome-less 404 markup).
 */
export default async function GlobalNotFound() {
	const categories: Category[] = await listPublicCategories()
		.then((result) => (result.status === 200 ? result.data : []))
		.catch(() => []);

	return (
		<QueryProvider>
			<EcommerceShell categories={categories}>
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 py-24 text-center">
					<h1 className="font-semibold text-3xl">Page not found</h1>
					<p className="max-w-md text-muted-foreground">
						The page you're looking for doesn't exist.
					</p>
					<Button asChild>
						<Link href="/products">Back to shop</Link>
					</Button>
				</div>
			</EcommerceShell>
		</QueryProvider>
	);
}
